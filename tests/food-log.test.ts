import { beforeAll, afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * เหมือน auth.test.ts — ย้าย cwd ไปโฟลเดอร์ชั่วคราวและสวม cookie jar ปลอม
 * ก่อน import โมดูลที่ผูกกับ Next
 */

const jar = new Map<string, string>();

mock.module("server-only", () => ({}));
mock.module("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) =>
      jar.has(key) ? { name: key, value: jar.get(key)! } : undefined,
    set: (key: string, value: string) => void jar.set(key, value),
    delete: (key: string) => void jar.delete(key),
  }),
}));

let auth: typeof import("@/lib/auth");
let log: typeof import("@/lib/food-log");
let db: typeof import("@/lib/db/store");
let workdir: string;
let origin: string;

const ALICE = "มะลิ";
const BOB = "น้ำหวาน";
const DATE = "2026-08-24";

beforeAll(async () => {
  origin = process.cwd();
  workdir = await fs.mkdtemp(path.join(os.tmpdir(), "imphodi-log-"));
  process.chdir(workdir);

  auth = await import("@/lib/auth");
  log = await import("@/lib/food-log");
  db = await import("@/lib/db/store");

  await auth.registerUser(ALICE, "secret123");
  await auth.registerUser(BOB, "secret123");
});

afterAll(async () => {
  process.chdir(origin);
  await fs.rm(workdir, { recursive: true, force: true });
});

/** ล็อกอินเป็นคนนี้ แล้วล้างรายการของวันทดสอบ */
async function loginAs(name: string) {
  jar.clear();
  await auth.startSession(name);
  await log.clearDay(DATE);
}

beforeEach(async () => {
  await loginAs(ALICE);
});

describe("เพิ่มรายการอาหาร", () => {
  test("เพิ่มแล้วอ่านกลับมาได้ พร้อมสำเนาชื่อและหน่วยเสิร์ฟ", async () => {
    const outcome = await log.addEntry({
      date: DATE,
      meal: "lunch",
      foodId: "khao-man-kai",
      servings: 1,
    });
    expect(outcome.ok).toBe(true);

    const entries = await log.listDay(DATE);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("ข้าวมันไก่");
    expect(entries[0].serving).toBe("1 จาน");
    expect(entries[0].meal).toBe("lunch");
    expect(entries[0].kcal).toBe(620);
  });

  test("จำนวนเสิร์ฟคูณค่าทั้งหมดตามจริง", async () => {
    await log.addEntry({
      date: DATE,
      meal: "dinner",
      foodId: "khao-man-kai",
      servings: 2,
    });

    const [entry] = await log.listDay(DATE);
    expect(entry.servings).toBe(2);
    expect(entry.kcal).toBe(1240);
    expect(entry.protein).toBe(60);
    expect(entry.carbs).toBe(160);
    expect(entry.fat).toBe(40);
  });

  test("ครึ่งเสิร์ฟก็ได้ ปัดเป็นครึ่งหน่วยให้ตรงกับปุ่มใน UI", async () => {
    await log.addEntry({
      date: DATE,
      meal: "snack",
      foodId: "khao-man-kai",
      servings: 1.7,
    });

    const [entry] = await log.listDay(DATE);
    expect(entry.servings).toBe(1.5);
    expect(entry.kcal).toBe(930);
  });

  /**
   * ค่าที่ไม่ลงล็อกครึ่งหน่วยจะถูก "ปัดเข้าใกล้ที่สุด" ไม่ใช่ปฏิเสธ
   * UI ส่งมาแต่ทีละ 0.5 อยู่แล้ว กฎนี้ไว้กันคำขอที่ปั้นมาเอง
   * ปัดแล้วค่าที่ได้ยังคงคำนวณ kcal ใหม่ให้ตรงกัน จึงไม่มีทางได้ข้อมูลเพี้ยน
   */
  test("จำนวนนอกล็อกครึ่งหน่วยถูกปัด แต่ต่ำกว่าครึ่งเสิร์ฟถูกปฏิเสธ", async () => {
    await log.addEntry({
      date: DATE,
      meal: "lunch",
      foodId: "khao-man-kai",
      servings: 0.25, // ปัดขึ้นเป็น 0.5
    });

    const [entry] = await log.listDay(DATE);
    expect(entry.servings).toBe(0.5);
    expect(entry.kcal).toBe(310); // คิดใหม่จาก 0.5 เสิร์ฟจริง ๆ

    // 0.1 ปัดลงเป็น 0 ซึ่งต่ำกว่าขั้นต่ำ จึงต้องถูกปฏิเสธ
    expect(
      (await log.addEntry({
        date: DATE,
        meal: "lunch",
        foodId: "khao-man-kai",
        servings: 0.1,
      })).ok,
    ).toBe(false);

    // แก้จำนวนก็ใช้กฎเดียวกัน
    expect((await log.setServings(entry.entryId, 0.25)).ok).toBe(true);
    expect((await log.setServings(entry.entryId, 0.1)).ok).toBe(false);
    expect((await log.listDay(DATE))[0].servings).toBe(0.5);
  });

  test("ปฏิเสธข้อมูลที่ใช้ไม่ได้", async () => {
    const bad = [
      { date: "24/08/2026", meal: "lunch", foodId: "khao-man-kai", servings: 1 },
      { date: DATE, meal: "brunch", foodId: "khao-man-kai", servings: 1 },
      { date: DATE, meal: "lunch", foodId: "ไม่มีเมนูนี้", servings: 1 },
      { date: DATE, meal: "lunch", foodId: "khao-man-kai", servings: 0 },
      { date: DATE, meal: "lunch", foodId: "khao-man-kai", servings: 999 },
      { date: DATE, meal: "lunch", foodId: "khao-man-kai", servings: "abc" },
    ];

    for (const input of bad) {
      expect((await log.addEntry(input)).ok).toBe(false);
    }

    expect(await log.listDay(DATE)).toHaveLength(0);
  });

  /**
   * server action คือ HTTP endpoint สาธารณะ ผู้โจมตีส่ง argument อะไรก็ได้
   * type ของ TypeScript ถูกลบตอน runtime จึงกันอะไรไม่ได้
   * ถ้าอ่านฟิลด์ก่อนเช็คว่าเป็น object จะได้ TypeError กลายเป็น 500 หลุดออกไป
   */
  test("payload ที่ไม่ใช่ object ต้องได้ข้อความบอก ไม่ใช่ throw เป็น 500", async () => {
    const junk = [null, undefined, 0, 42, "x", true, [], [1, 2, 3], NaN];

    for (const payload of junk) {
      const outcome = await log.addEntry(payload);
      expect(outcome.ok).toBe(false);
    }

    // object ที่ไม่มีฟิลด์เลยก็ต้องไม่ throw
    expect((await log.addEntry({})).ok).toBe(false);
    expect(await log.listDay(DATE)).toHaveLength(0);
  });

  test("รายการของวันอื่นไม่ปนกัน", async () => {
    await log.addEntry({ date: DATE, meal: "lunch", foodId: "banana", servings: 1 });
    await log.addEntry({
      date: "2026-08-25",
      meal: "lunch",
      foodId: "apple",
      servings: 1,
    });

    expect(await log.listDay(DATE)).toHaveLength(1);
    expect(await log.listDay("2026-08-25")).toHaveLength(1);

    await log.clearDay("2026-08-25");
  });
});

describe("แก้จำนวนและลบ", () => {
  test("แก้จำนวนแล้วค่าทั้งหมดคิดใหม่จากค่าต่อหนึ่งเสิร์ฟ", async () => {
    await log.addEntry({
      date: DATE,
      meal: "lunch",
      foodId: "khao-man-kai",
      servings: 1,
    });
    const [before] = await log.listDay(DATE);

    expect((await log.setServings(before.entryId, 3)).ok).toBe(true);

    const [after] = await log.listDay(DATE);
    expect(after.servings).toBe(3);
    expect(after.kcal).toBe(1860);
    expect(after.protein).toBe(90);
  });

  test("แก้จำนวนซ้ำ ๆ ไม่ทำให้ค่าเพี้ยนทับถม", async () => {
    await log.addEntry({
      date: DATE,
      meal: "lunch",
      foodId: "khao-man-kai",
      servings: 1,
    });
    const [entry] = await log.listDay(DATE);

    for (const value of [2, 5, 1.5, 0.5, 1]) {
      await log.setServings(entry.entryId, value);
    }

    const [final] = await log.listDay(DATE);
    expect(final.servings).toBe(1);
    expect(final.kcal).toBe(620); // กลับมาเท่าเดิมเป๊ะ
  });

  test("ลบรายการเดียวได้ ไม่กระทบรายการอื่น", async () => {
    await log.addEntry({ date: DATE, meal: "lunch", foodId: "banana", servings: 1 });
    await log.addEntry({ date: DATE, meal: "lunch", foodId: "apple", servings: 1 });

    const entries = await log.listDay(DATE);
    expect((await log.removeEntry(entries[0].entryId)).ok).toBe(true);

    const left = await log.listDay(DATE);
    expect(left).toHaveLength(1);
    expect(left[0].entryId).toBe(entries[1].entryId);
  });

  test("ล้างทั้งวันแล้วว่างเปล่า", async () => {
    await log.addEntry({ date: DATE, meal: "lunch", foodId: "banana", servings: 1 });
    await log.addEntry({ date: DATE, meal: "dinner", foodId: "apple", servings: 1 });

    expect((await log.clearDay(DATE)).ok).toBe(true);
    expect(await log.listDay(DATE)).toHaveLength(0);
  });

  test("อ้าง entryId ที่ไม่มีจริงก็ไม่พัง", async () => {
    expect((await log.removeEntry("ไม่มี-id-นี้")).ok).toBe(false);
    expect((await log.setServings("ไม่มี-id-นี้", 2)).ok).toBe(false);
    expect((await log.removeEntry("")).ok).toBe(false);
  });
});

// ส่วนสำคัญที่สุดด้านความปลอดภัย — ห้ามแตะข้อมูลของคนอื่น
describe("สิทธิ์การเข้าถึงข้อมูลข้ามผู้ใช้", () => {
  test("คนอื่นแก้หรือลบรายการของเราไม่ได้", async () => {
    await log.addEntry({
      date: DATE,
      meal: "lunch",
      foodId: "khao-man-kai",
      servings: 1,
    });
    const [mine] = await log.listDay(DATE);

    // สลับไปเป็นอีกคน แล้วลองยุ่งกับ entryId ของคนแรก
    jar.clear();
    await auth.startSession(BOB);

    expect((await log.removeEntry(mine.entryId)).ok).toBe(false);
    expect((await log.setServings(mine.entryId, 5)).ok).toBe(false);
    expect(await log.listDay(DATE)).toHaveLength(0);

    // ของเจ้าของยังอยู่ครบและไม่ถูกแก้
    jar.clear();
    await auth.startSession(ALICE);

    const after = await log.listDay(DATE);
    expect(after).toHaveLength(1);
    expect(after[0].servings).toBe(1);
    expect(after[0].kcal).toBe(620);
  });

  test("ล้างทั้งวันของตัวเอง ไม่ลบของคนอื่น", async () => {
    await log.addEntry({ date: DATE, meal: "lunch", foodId: "banana", servings: 1 });

    jar.clear();
    await auth.startSession(BOB);
    await log.addEntry({ date: DATE, meal: "lunch", foodId: "apple", servings: 1 });
    await log.clearDay(DATE);
    expect(await log.listDay(DATE)).toHaveLength(0);

    jar.clear();
    await auth.startSession(ALICE);
    expect(await log.listDay(DATE)).toHaveLength(1);
  });

  test("ยังไม่ล็อกอิน อ่านไม่เห็นและเขียนไม่ได้", async () => {
    await log.addEntry({ date: DATE, meal: "lunch", foodId: "banana", servings: 1 });
    const [mine] = await log.listDay(DATE);

    jar.clear();

    expect(await log.listDay(DATE)).toEqual([]);
    expect(
      (await log.addEntry({
        date: DATE,
        meal: "lunch",
        foodId: "banana",
        servings: 1,
      })).ok,
    ).toBe(false);
    expect((await log.removeEntry(mine.entryId)).ok).toBe(false);
    expect((await log.setServings(mine.entryId, 2)).ok).toBe(false);
    expect((await log.clearDay(DATE)).ok).toBe(false);
  });
});

describe("immutable nutrition snapshots", () => {
  test("recalculates from the stored snapshot while the food remains in the catalog", async () => {
    await log.addEntry({
      date: DATE,
      meal: "lunch",
      foodId: "khao-man-kai",
      servings: 2,
    });
    const [entry] = await log.listDay(DATE);
    const key = await auth.getSessionKey();

    expect(key).not.toBeNull();
    await db.getStore().updateEntryServings(key!, entry.entryId, 2, {
      kcal: 1000,
      protein: 50,
      carbs: 100,
      fat: 10,
    });

    expect((await log.setServings(entry.entryId, 3)).ok).toBe(true);

    const [updated] = await log.listDay(DATE);
    expect(updated).toMatchObject({
      servings: 3,
      kcal: 1500,
      protein: 75,
      carbs: 150,
      fat: 15,
    });
  });
});

describe("todayKey", () => {
  test("คืนวันที่รูปแบบ YYYY-MM-DD", () => {
    expect(log.todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
