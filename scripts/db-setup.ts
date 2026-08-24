/**
 * เตรียม MongoDB ให้พร้อมใช้ — รันซ้ำได้ปลอดภัย (idempotent)
 *
 *   bun run db:setup
 *
 * ทำสามอย่าง
 *   1. สร้าง collection พร้อม $jsonSchema validator (กันข้อมูลเพี้ยนที่ชั้น DB)
 *   2. สร้าง index ตามที่ประกาศไว้ใน src/lib/db/schema.ts
 *   3. อ่านกลับมาโชว์ให้เห็นว่าของจริงบนเซิร์ฟเวอร์ตรงกับที่ประกาศไว้
 *
 * สคริปต์นี้ต่อ MongoClient เองแทนที่จะ import mongo-store
 * เพราะไฟล์นั้นมี `import "server-only"` ซึ่งพังเมื่อรันนอก Next
 */

import { MongoClient } from "mongodb";

import { COLLECTIONS, INDEXES, VALIDATORS } from "../src/lib/db/schema";
import { sanitizeMongoUri } from "./mongo-uri";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "imphodi";

if (!uri) {
  console.error(
    [
      "",
      "✗ ไม่ได้ตั้ง MONGODB_URI",
      "",
      "  1. คัดลอก .env.example เป็น .env.local",
      "  2. ใส่ connection string จาก MongoDB Atlas",
      "     (Cluster → Connect → Drivers)",
      "  3. รันคำสั่งนี้อีกครั้ง",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

// ปิด credentials ตอนพิมพ์ออกจอ กัน log หลุด
const safeUri = sanitizeMongoUri(uri);
console.log(`\nกำลังต่อ ${safeUri}`);
console.log(`ฐานข้อมูล: ${dbName}\n`);

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15_000 });

try {
  await client.connect();
  await client.db(dbName).command({ ping: 1 });
  console.log("✓ ต่อสำเร็จ\n");
} catch (error) {
  console.error("✗ ต่อไม่ได้:", error instanceof Error ? error.message : error);
  console.error(
    [
      "",
      "เช็คสามข้อนี้",
      "  · รหัสผ่านใน connection string ถูกไหม (อักขระพิเศษต้อง url-encode)",
      "  · Atlas → Network Access เปิดให้ IP นี้เข้าถึงหรือยัง",
      "    (Vercel ใช้ IP ไม่คงที่ ต้องใส่ 0.0.0.0/0)",
      "  · ชื่อ cluster ถูกต้องไหม",
      "",
    ].join("\n"),
  );
  await client.close();
  process.exit(1);
}

const db = client.db(dbName);

/* ------------------------------------------------------- 1. collections */

const existing = new Set(
  (await db.listCollections({}, { nameOnly: true }).toArray()).map(
    (item) => item.name,
  ),
);

for (const name of Object.values(COLLECTIONS)) {
  const validator = VALIDATORS[name as keyof typeof VALIDATORS];

  if (existing.has(name)) {
    // มีอยู่แล้ว — อัปเดต validator ให้ตรงกับที่ประกาศไว้ตอนนี้
    await db.command({
      collMod: name,
      validator: validator as Record<string, unknown>,
      validationLevel: "moderate",
    });
    console.log(`✓ collection "${name}" มีอยู่แล้ว — อัปเดต validator`);
  } else {
    await db.createCollection(name, {
      validator: validator as Record<string, unknown>,
      validationLevel: "moderate",
    });
    console.log(`✓ สร้าง collection "${name}" พร้อม validator`);
  }
}

/* ------------------------------------------------------------ 2. indexes */

console.log("");

for (const [name, specs] of Object.entries(INDEXES)) {
  const collection = db.collection(name);

  for (const spec of specs) {
    try {
      await collection.createIndex(spec.key as Record<string, 1 | -1>, {
        name: spec.name,
        unique: "unique" in spec ? Boolean(spec.unique) : false,
      });
      console.log(`✓ index ${name}.${spec.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // 85/86 = มี index ชื่อเดิมแต่ spec ต่าง ต้องลบก่อนสร้างใหม่
      console.error(`✗ index ${name}.${spec.name}: ${message}`);
      console.error(
        `  ถ้าเคยสร้างด้วย spec อื่นไว้ ให้ลบทิ้งก่อน: db.${name}.dropIndex("${spec.name}")`,
      );
    }
  }
}

/* -------------------------------------------------------- 3. ตรวจของจริง */

console.log("\n─── สภาพจริงบนเซิร์ฟเวอร์ ───");

for (const name of Object.values(COLLECTIONS)) {
  const collection = db.collection(name);
  const count = await collection.countDocuments();
  const indexes = await collection.indexes();

  console.log(`\n${name}  (${count} เอกสาร)`);
  for (const index of indexes) {
    const keys = Object.entries(index.key)
      .map(([field, direction]) => `${field}:${direction}`)
      .join(", ");
    console.log(`  · ${index.name}  {${keys}}${index.unique ? "  unique" : ""}`);
  }
}

/* ------------------------------------------- ทดสอบว่า validator ทำงานจริง */

console.log("\n─── ทดสอบ validator ───");

try {
  await db.collection(COLLECTIONS.foodEntries).insertOne({
    // ตั้งใจให้ผิด: date ผิดรูปแบบ และ meal ไม่มีในรายการ
    entryId: "validator-probe",
    userKey: "validator-probe",
    date: "not-a-date",
    meal: "brunch",
    foodId: "x",
    name: "x",
    servings: 1,
    kcal: 1,
  } as never);

  // ถ้าใส่เข้าได้ แปลว่า validator ไม่ทำงาน ต้องลบทิ้งแล้วเตือน
  await db
    .collection(COLLECTIONS.foodEntries)
    .deleteOne({ entryId: "validator-probe" });
  console.log("⚠ validator ไม่ได้กันข้อมูลผิดรูป — ตรวจ VALIDATORS ใน schema.ts");
} catch {
  console.log("✓ validator กันข้อมูลผิดรูปได้จริง");
}

console.log("\nเสร็จแล้ว — ตั้ง MONGODB_URI บน Vercel ด้วยนะ\n");

await client.close();
