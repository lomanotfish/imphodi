import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { Profile } from "@/lib/calories";

/**
 * auth.ts ผูกกับ Next (server-only + next/headers) และอ่าน/เขียนไฟล์ใน cwd
 * เทสต์นี้จึงย้าย cwd ไปโฟลเดอร์ชั่วคราวและสวม cookie jar ปลอมให้ก่อน import
 */

const jar = new Map<string, string>();

mock.module("server-only", () => ({}));
mock.module("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) =>
      jar.has(key) ? { name: key, value: jar.get(key)! } : undefined,
    set: (key: string, value: string) => {
      jar.set(key, value);
    },
    delete: (key: string) => {
      jar.delete(key);
    },
  }),
}));

type AuthModule = typeof import("@/lib/auth");

let auth: AuthModule;
let workdir: string;
let origin: string;

const profile: Profile = {
  gender: "female",
  age: 28,
  weight: 55,
  height: 162,
  activity: "moderate",
  goal: "lose",
};

beforeAll(async () => {
  origin = process.cwd();
  workdir = await fs.mkdtemp(path.join(os.tmpdir(), "imphodi-test-"));
  process.chdir(workdir);
  auth = await import("@/lib/auth");
});

afterAll(async () => {
  process.chdir(origin);
  await fs.rm(workdir, { recursive: true, force: true });
});

const readStore = async () =>
  JSON.parse(await fs.readFile(path.join(workdir, "data", "db.json"), "utf8"));

describe("สมัครสมาชิก", () => {
  test("requires an eight-character password minimum", () => {
    expect(auth.PASSWORD_RULE.min).toBe(8);
    expect(auth.validatePassword("1234567")).toContain("8");
    expect(auth.validatePassword("12345678")).toBeNull();
  });

  test("สมัครด้วยชื่อไทยและรหัสที่ยาวพอ ผ่าน", async () => {
    const outcome = await auth.registerUser("มะลิ", "secret123");

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.user.name).toBe("มะลิ");
      expect(outcome.user.profile).toBeNull();
    }
  });

  test("ไม่เก็บรหัสจริงลงไฟล์ เก็บแต่ salt กับ hash", async () => {
    const store = await readStore();
    const record = store.users["มะลิ"];

    expect(record).toBeDefined();
    expect(record.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(record.passwordHash).toMatch(/^[0-9a-f]{128}$/);
    expect(JSON.stringify(store)).not.toContain("secret123");
  });

  test("ชื่อซ้ำสมัครไม่ได้ ไม่ว่าจะพิมพ์ตัวพิมพ์ใหญ่เล็กต่างกัน", async () => {
    expect(await auth.registerUser("มะลิ", "another-one")).toEqual({
      ok: false,
      error: "ชื่อนี้มีคนใช้แล้ว ลองชื่ออื่นนะ",
    });

    await auth.registerUser("Rose", "secret123");
    const clash = await auth.registerUser("rose", "secret123");
    expect(clash.ok).toBe(false);
  });

  // สระและวรรณยุกต์ไทยเป็น combining mark (\p{M}) ไม่ใช่ \p{L}
  // ถ้า regex ตรวจชื่อลืมครอบ \p{M} ชื่อไทยส่วนใหญ่จะสมัครไม่ได้เลย
  test("ชื่อไทยที่มีสระและวรรณยุกต์สมัครได้", async () => {
    const names = ["น้ำหวาน", "ปุ๊กกี้", "พิ์มพ์ใจ", "ส้มโอ", "แป้ง", "ญดา"];

    for (const name of names) {
      expect(auth.validateName(name)).toBeNull();
      const outcome = await auth.registerUser(name, "secret123");
      expect(outcome.ok).toBe(true);
    }
  });

  test("ตัดช่องว่างหัวท้ายและยุบช่องว่างซ้ำในชื่อ", async () => {
    const outcome = await auth.registerUser("  น้อง   หน่า  ", "secret123");
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.user.name).toBe("น้อง หน่า");
  });

  test("ปฏิเสธชื่อสั้นเกิน ยาวเกิน และอักขระแปลก", async () => {
    expect((await auth.registerUser("ก", "secret123")).ok).toBe(false);
    expect((await auth.registerUser("ก".repeat(25), "secret123")).ok).toBe(false);
    expect((await auth.registerUser("bad<script>", "secret123")).ok).toBe(false);
    expect((await auth.registerUser("   ", "secret123")).ok).toBe(false);
  });

  test("ปฏิเสธรหัสสั้นเกินและยาวเกิน", async () => {
    expect((await auth.registerUser("สั้น", "12345")).ok).toBe(false);
    expect((await auth.registerUser("ยาว", "x".repeat(73))).ok).toBe(false);
  });
});

describe("เข้าสู่ระบบ", () => {
  test("รหัสถูกต้องเข้าได้", async () => {
    const outcome = await auth.authenticateUser("มะลิ", "secret123");
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.user.name).toBe("มะลิ");
  });

  test("ชื่อไม่ตรงตัวพิมพ์ก็ยังเข้าได้", async () => {
    expect((await auth.authenticateUser("ROSE", "secret123")).ok).toBe(true);
  });

  test("รหัสผิดเข้าไม่ได้ และข้อความไม่บอกว่าชื่อมีอยู่จริงไหม", async () => {
    const wrongPassword = await auth.authenticateUser("มะลิ", "not-the-one");
    const noSuchUser = await auth.authenticateUser("ไม่มีคนนี้", "not-the-one");

    expect(wrongPassword.ok).toBe(false);
    expect(noSuchUser.ok).toBe(false);
    if (!wrongPassword.ok && !noSuchUser.ok) {
      expect(wrongPassword.error).toBe(noSuchUser.error);
    }
  });

  test("เดารหัสผิดซ้ำ ๆ จะถูกล็อกชั่วคราว", async () => {
    await auth.registerUser("เป้าโจมตี", "secret123");

    let lastError = "";
    for (let attempt = 0; attempt < 9; attempt += 1) {
      const outcome = await auth.authenticateUser("เป้าโจมตี", "wrong");
      if (!outcome.ok) lastError = outcome.error;
    }

    expect(lastError).toContain("ลองผิดหลายครั้งเกินไป");

    // ล็อกแล้วแม้รหัสถูกก็ยังเข้าไม่ได้
    const blocked = await auth.authenticateUser("เป้าโจมตี", "secret123");
    expect(blocked.ok).toBe(false);
  });
});

describe("เซสชัน", () => {
  test("เปิดเซสชันแล้วอ่านผู้ใช้ปัจจุบันได้", async () => {
    jar.clear();
    await auth.startSession("มะลิ");

    const cookie = jar.get("imphodi_session");
    expect(cookie).toBeDefined();
    expect(cookie).toContain(".");

    const current = await auth.getCurrentUser();
    expect(current?.name).toBe("มะลิ");
  });

  test("cookie ที่ถูกแก้ไขใช้ไม่ได้ เพราะลายเซ็นไม่ตรง", async () => {
    jar.clear();
    await auth.startSession("มะลิ");

    const [payload, signature] = jar.get("imphodi_session")!.split(".");

    // ปลอมชื่อผู้ใช้ในเนื้อ cookie แต่ใช้ลายเซ็นเดิม
    const forged = Buffer.from(
      JSON.stringify({ u: "rose", exp: Date.now() + 60_000 }),
    ).toString("base64url");

    jar.set("imphodi_session", `${forged}.${signature}`);
    expect(await auth.getCurrentUser()).toBeNull();

    // ปลอมลายเซ็น
    jar.set("imphodi_session", `${payload}.${"a".repeat(signature.length)}`);
    expect(await auth.getCurrentUser()).toBeNull();

    // ไม่มีลายเซ็นเลย
    jar.set("imphodi_session", payload);
    expect(await auth.getCurrentUser()).toBeNull();
  });

  test("ไม่มี cookie ก็ไม่มีผู้ใช้", async () => {
    jar.clear();
    expect(await auth.getCurrentUser()).toBeNull();
  });

  test("ออกจากระบบแล้วอ่านผู้ใช้ไม่ได้อีก", async () => {
    jar.clear();
    await auth.startSession("มะลิ");
    expect(await auth.getCurrentUser()).not.toBeNull();

    await auth.endSession();
    expect(await auth.getCurrentUser()).toBeNull();
  });
});

describe("ธีมที่จำไว้ในบัญชี", () => {
  test("สมัครใหม่ได้ธีมเริ่มต้น", async () => {
    const outcome = await auth.registerUser("คนธีม", "secret123");
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.user.theme).toBe("pink");
  });

  test("เปลี่ยนธีมแล้วล็อกอินใหม่ได้ธีมเดิมกลับมา", async () => {
    jar.clear();
    await auth.startSession("คนธีม");
    await auth.saveUserTheme("blue");

    expect((await auth.getCurrentUser())?.theme).toBe("blue");

    // ล็อกอินใหม่หมดจด ต้องยังได้ฟ้า
    jar.clear();
    const again = await auth.authenticateUser("คนธีม", "secret123");
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.user.theme).toBe("blue");
  });

  test("ยังไม่ล็อกอิน บันทึกธีมไม่ได้ แต่ไม่พัง", async () => {
    jar.clear();
    await expect(auth.saveUserTheme("yellow")).resolves.toBeUndefined();
  });
});

/**
 * บั๊กที่เคยเกิด: layout อ่านธีมจาก cookie เท่านั้น พอเปิดจากเครื่องใหม่
 * (ยังไม่มี cookie ธีม) ธีมที่จำไว้ในบัญชีจะถูกมองข้าม กลายเป็นสีชมพูหมด
 */
describe("resolveTheme — ลำดับความสำคัญของธีม", () => {
  const THEME_COOKIE = "imphodi_theme";
  let resolveTheme: () => Promise<string>;

  test("โหลดโมดูลได้", async () => {
    ({ resolveTheme } = await import("@/lib/theme-server"));
    expect(typeof resolveTheme).toBe("function");
  });

  test("cookie มาก่อนธีมในบัญชี (ผู้ใช้เพิ่งกดเปลี่ยน)", async () => {
    jar.clear();
    await auth.startSession("คนธีม");
    await auth.saveUserTheme("blue");

    jar.set(THEME_COOKIE, "yellow");
    expect(await resolveTheme()).toBe("yellow");
  });

  test("ไม่มี cookie ใช้ธีมที่จำไว้ในบัญชี", async () => {
    jar.clear();
    await auth.startSession("คนธีม");
    await auth.saveUserTheme("blue");

    jar.delete(THEME_COOKIE);
    expect(await resolveTheme()).toBe("blue");
  });

  test("cookie ค่าเพี้ยนก็ถอยไปใช้ธีมในบัญชี", async () => {
    jar.clear();
    await auth.startSession("คนธีม");
    await auth.saveUserTheme("blue");

    jar.set(THEME_COOKIE, "rainbow");
    expect(await resolveTheme()).toBe("blue");
  });

  test("ไม่ล็อกอินและไม่มี cookie ได้ธีมเริ่มต้น", async () => {
    jar.clear();
    expect(await resolveTheme()).toBe("pink");
  });
});

describe("บันทึกข้อมูลร่างกาย", () => {
  test("บันทึกแล้วอ่านกลับมาได้ครบ", async () => {
    jar.clear();
    await auth.startSession("มะลิ");

    expect(await auth.saveUserProfile(profile)).toEqual({ ok: true });

    const current = await auth.getCurrentUser();
    expect(current?.profile).toEqual(profile);
  });

  test("ข้อมูลผิดรูปไม่ถูกบันทึก", async () => {
    jar.clear();
    await auth.startSession("มะลิ");

    const outcome = await auth.saveUserProfile({ ...profile, weight: 9999 });
    expect(outcome.ok).toBe(false);

    // ของเดิมยังอยู่ ไม่ถูกเขียนทับ
    const current = await auth.getCurrentUser();
    expect(current?.profile).toEqual(profile);
  });

  test("ยังไม่ล็อกอินก็บันทึกไม่ได้", async () => {
    jar.clear();
    const outcome = await auth.saveUserProfile(profile);
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toContain("เซสชัน");
  });

  test("เขียนพร้อมกันหลายคำขอไม่ทำให้ข้อมูลคนอื่นหาย", async () => {
    await Promise.all([
      auth.registerUser("พร้อมกันหนึ่ง", "secret123"),
      auth.registerUser("พร้อมกันสอง", "secret123"),
      auth.registerUser("พร้อมกันสาม", "secret123"),
    ]);

    const store = await readStore();
    expect(store.users["พร้อมกันหนึ่ง"]).toBeDefined();
    expect(store.users["พร้อมกันสอง"]).toBeDefined();
    expect(store.users["พร้อมกันสาม"]).toBeDefined();
    expect(store.users["มะลิ"]).toBeDefined();
  });
});
