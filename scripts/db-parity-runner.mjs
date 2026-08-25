/**
 * รัน scripts/db-parity.ts กับ MongoDB จริง
 *
 *   bun run db:parity
 *
 * ต้องรันผ่าน Node ไม่ใช่ Bun เพราะ bson เรียก node:v8 isBuildingSnapshot
 * ซึ่ง Bun ยังไม่รองรับ (เหมือน db:setup)
 *
 * jiti ทำสองอย่างให้: โหลด TypeScript ที่ import แบบไม่มีนามสกุล
 * และ alias โมดูลที่ผูกกับ Next ออกไปเป็นของปลอม เพื่อให้เรียก
 * โค้ดจริงใน src/lib ได้ทั้งชั้นโดยไม่ต้องมี request ของ Next
 */
import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createJiti } from "jiti";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

const jiti = createJiti(import.meta.url, {
  alias: {
    // path alias ของ tsconfig — jiti ไม่ได้อ่าน tsconfig ให้เอง
    "@": path.join(root, "src"),
    // server-only โยน error เมื่อถูก import นอก RSC
    "server-only": path.join(here, "parity-stubs", "empty.mjs"),
    // next/headers ใช้ได้แค่ในคำขอจริง — แทนด้วย cookie jar ในหน่วยความจำ
    "next/headers": path.join(here, "parity-stubs", "headers.mjs"),
  },
});

// ใช้ helper ตัวจริงแทนที่จะเขียน DNS ซ้ำ — ต้องโหลดผ่าน jiti เพราะเป็น .ts
const { configureMongoSrvDns } = await jiti.import("../src/lib/db/mongo-dns.ts");

// DNS ของ Windows ปฏิเสธ SRV ของ Atlas ได้ทั้งที่ OS resolve ผ่าน
configureMongoSrvDns({ setServers: (servers) => dns.setServers(servers) });

await jiti.import("./db-parity.ts");
