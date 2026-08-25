/**
 * ทดสอบ mongoStore กับ Atlas จริง — เทียบพฤติกรรมให้ตรงกับ fileStore
 * เน้น "ค่าที่คืนออกมา" เพราะชั้นบนใช้ตัดสินเรื่องสิทธิ์
 * ล้างข้อมูลทดสอบทิ้งทุกครั้งตอนจบ
 */
// @ts-expect-error — jiti alias ชี้ next/headers ไปที่ stub ที่ export jar ด้วย
import { jar } from "next/headers";

import { getStore, storeKind } from "../src/lib/db/store";
import {
  authenticateUser,
  getCurrentUser,
  registerUser,
  saveUserProfile,
  saveUserTheme,
  startSession,
} from "../src/lib/auth";
import {
  addEntry,
  clearDay,
  listDay,
  removeEntry,
  setServings,
  sumTotals,
} from "../src/lib/food-log";
import { closeMongo, mongoDb } from "../src/lib/db/mongo-store";
import { COLLECTIONS } from "../src/lib/db/schema";
import type { Profile } from "../src/lib/calories";

let pass = 0;
let fail = 0;
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (ok) pass += 1;
  else fail += 1;
};

console.log(`store ที่ใช้: ${storeKind()}\n`);
if (storeKind() !== "mongodb") {
  console.error("✗ ไม่ได้ต่อ MongoDB — ตรวจ MONGODB_URI");
  process.exit(1);
}

const stamp = Date.now().toString().slice(-6);
const ALICE = `เทสต์เอ${stamp}`;
const BOB = `เทสต์บี${stamp}`;
const aliceKey = ALICE.toLocaleLowerCase("th-TH");
const bobKey = BOB.toLocaleLowerCase("th-TH");
const DATE = "2026-08-24";
const PASSWORD = "secret123";

const profile: Profile = {
  gender: "female",
  age: 28,
  weight: 55,
  height: 162,
  activity: "moderate",
  goal: "lose",
};

const loginAs = async (name: string) => {
  jar.clear();
  await startSession(name);
};

const store = getStore();

try {
  /* ------------------------------------------------------------- สมัคร */
  check((await registerUser(ALICE, PASSWORD)).ok, `สมัคร "${ALICE}" ลง MongoDB`);
  check((await registerUser(BOB, PASSWORD)).ok, `สมัคร "${BOB}"`);

  const dup = await registerUser(ALICE, PASSWORD);
  check(
    !dup.ok && dup.error.includes("มีคนใช้แล้ว"),
    "ชื่อซ้ำถูกปฏิเสธด้วย unique index (ไม่ throw ออกมา)",
  );

  /* ---------------------------------------------------------- ล็อกอิน */
  check((await authenticateUser(ALICE, PASSWORD)).ok, "ล็อกอินรหัสถูก");
  check(
    !(await authenticateUser(ALICE, "wrong-one")).ok,
    "ล็อกอินรหัสผิดถูกปฏิเสธ",
  );

  /* -------------------------------------------------- profile กับ theme */
  await loginAs(ALICE);
  check((await saveUserProfile(profile)).ok, "บันทึก profile");
  check(
    JSON.stringify((await getCurrentUser())?.profile) === JSON.stringify(profile),
    "อ่าน profile กลับมาครบถ้วน",
  );

  await saveUserTheme("blue");
  check((await getCurrentUser())?.theme === "blue", "บันทึก/อ่าน theme");

  // matchedCount ไม่ใช่ modifiedCount — เขียนค่าเดิมซ้ำต้องยังนับว่าสำเร็จ
  check(
    await store.updateUser(aliceKey, { theme: "blue" }),
    "updateUser คืน true แม้ค่าไม่เปลี่ยน (matchedCount)",
  );
  check(
    !(await store.updateUser(`ไม่มีคนนี้${stamp}`, { theme: "pink" })),
    "updateUser คืน false เมื่อไม่มีผู้ใช้",
  );

  // profile: null ต้องเขียนลงได้จริง ไม่ใช่ถูกมองข้าม
  await store.updateUser(aliceKey, { profile: null });
  check(
    (await store.findUser(aliceKey))?.profile === null,
    "เขียน profile: null ได้ (คีย์ที่ส่งมาเป็น null ต้องไม่ถูกข้าม)",
  );
  await saveUserProfile(profile);

  check(
    (await store.findUser(`ไม่มีคนนี้${stamp}`)) === null,
    "findUser คืน null เมื่อไม่พบ (ไม่ใช่ undefined)",
  );

  /* -------------------------------------------------- บันทึกมื้ออาหาร */
  await clearDay(DATE);
  await addEntry({ date: DATE, meal: "lunch", foodId: "khao-man-kai", servings: 1 });
  await addEntry({ date: DATE, meal: "snack", foodId: "banana", servings: 2 });

  const entries = await listDay(DATE);
  check(entries.length === 2, `บันทึก 2 รายการ (ได้ ${entries.length})`);

  const total = sumTotals(entries).kcal;
  check(total === 620 + 117 * 2, `ยอดรวมถูกต้อง ${total} = 854`);
  check(
    entries[0].foodId === "khao-man-kai",
    "เรียงตาม createdAt เก่าไปใหม่ (ตรงกับ fileStore)",
  );

  const mine = entries.find((item) => item.foodId === "khao-man-kai")!;
  check((await setServings(mine.entryId, 2)).ok, "แก้จำนวนเสิร์ฟ");
  check(
    (await listDay(DATE)).find((i) => i.foodId === "khao-man-kai")!.kcal === 1240,
    "แก้จำนวนแล้ว kcal คิดใหม่ถูก",
  );
  check(
    (await setServings(mine.entryId, 2)).ok,
    "แก้จำนวนเป็นค่าเดิมยังคืนสำเร็จ (matchedCount)",
  );

  /* ------------------------------------------ สิทธิ์ข้ามผู้ใช้ (สำคัญสุด) */
  await loginAs(BOB);
  check((await listDay(DATE)).length === 0, "ผู้ใช้อื่นไม่เห็นรายการของคนแรก");
  check(!(await removeEntry(mine.entryId)).ok, "ผู้ใช้อื่นลบรายการของคนแรกไม่ได้");
  check(!(await setServings(mine.entryId, 9)).ok, "ผู้ใช้อื่นแก้รายการของคนแรกไม่ได้");
  check(
    (await store.findEntry(bobKey, mine.entryId)) === null,
    "findEntry กรอง userKey ด้วย ไม่ใช่แค่ entryId",
  );

  await loginAs(ALICE);
  const still = await listDay(DATE);
  check(still.length === 2, "ของเจ้าของยังอยู่ครบหลังคนอื่นพยายามแตะ");
  check(
    still.find((i) => i.foodId === "khao-man-kai")!.servings === 2,
    "และค่าไม่ถูกแก้",
  );

  /* --------------------------------------------------------- ลบ/ล้างวัน */
  check((await removeEntry(mine.entryId)).ok, "เจ้าของลบรายการของตัวเองได้");
  check((await listDay(DATE)).length === 1, "เหลือ 1 รายการ");
  check(!(await removeEntry(`ไม่มี-id-${stamp}`)).ok, "ลบ id ที่ไม่มีคืน false");

  await clearDay(DATE);
  check((await listDay(DATE)).length === 0, "ล้างทั้งวันได้");

  /* ---------------------------------------- ยืนยันว่าลงฐานข้อมูลจริง */
  const db = await mongoDb();
  const users = db.collection(COLLECTIONS.users);

  const count = await users.countDocuments({ nameKey: { $in: [aliceKey, bobKey] } });
  check(count === 2, `เอกสารผู้ใช้อยู่ใน MongoDB จริง (${count})`);

  const stored = await users.findOne({ nameKey: aliceKey });
  check(
    typeof stored?.passwordHash === "string" &&
      !JSON.stringify(stored).includes(PASSWORD),
    "ไม่มีรหัสผ่านจริงอยู่ในเอกสาร เก็บแต่ salt กับ hash",
  );
  check(
    stored?._id !== undefined && (await store.findUser(aliceKey))?._id === undefined,
    "_id ถูกตัดออกก่อนส่งกลับชั้นบน (projection ทำงาน)",
  );
} finally {
  const db = await mongoDb();
  const removedUsers = await db
    .collection(COLLECTIONS.users)
    .deleteMany({ nameKey: { $in: [aliceKey, bobKey] } });
  const removedRows = await db
    .collection(COLLECTIONS.foodEntries)
    .deleteMany({ userKey: { $in: [aliceKey, bobKey] } });

  console.log(
    `\nล้างข้อมูลทดสอบ: ผู้ใช้ ${removedUsers.deletedCount} · รายการอาหาร ${removedRows.deletedCount}`,
  );
  await closeMongo();
}

console.log(`\nสรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail === 0 ? 0 : 1);
