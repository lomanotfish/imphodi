---
name: db-change
description: ใช้เมื่อจะแก้โครงสร้างข้อมูล เพิ่มฟิลด์ เพิ่ม collection แก้ index/validator หรือแตะชั้นเก็บข้อมูล (DataStore, fileStore, mongoStore) — เช่น "เพิ่มฟิลด์ในผู้ใช้", "เก็บประวัติย้อนหลัง", "แก้ schema", "add a field", "change the store"
---

# แก้โครงสร้างข้อมูล / ชั้นเก็บข้อมูล

## สถาปัตยกรรม

```
auth.ts / food-log.ts          ← เรียกผ่าน getStore() เท่านั้น
        ↓
DataStore (interface)          ← src/lib/db/store.ts
        ↓
fileStore  |  mongoStore       ← เลือกด้วย MONGODB_URI
```

**มีสองอิมพลีเมนต์ที่ต้องแก้ให้ตรงกันเสมอ** ลืมตัวใดตัวหนึ่งแล้วจะเพี้ยนเฉพาะบางสภาพแวดล้อม
`store.ts` เป็นไฟล์เดียวที่แตะ `node:fs` ได้ — ห้ามเรียก fs หรือ MongoDB จากที่อื่น

## ลำดับการแก้

1. **[src/lib/db/schema.ts](../../../src/lib/db/schema.ts)** — type, `COLLECTIONS`, `INDEXES`, `VALIDATORS`
   ไฟล์นี้เป็น type + ค่าคงที่ล้วน จึง import จากฝั่ง client ได้ (ห้ามใส่ logic ที่แตะ I/O)
2. **`DataStore` interface** ใน store.ts — เขียน JSDoc บอกความหมายของค่าที่คืน
3. **`fileStore`** — อยู่ใต้ `serialize()` ถ้าเป็นการเขียน
4. **`mongoStore`** ใน [mongo-store.ts](../../../src/lib/db/mongo-store.ts)
5. **`scripts/db-parity.ts`** — เพิ่มเคสให้ครอบของใหม่
6. รัน `bun run db:setup` แล้ว `bun run db:parity`

## กับดักเรื่องความหมายของค่าที่คืน (สำคัญที่สุด)

ชั้นบนใช้ค่าที่ store คืน **ตัดสินเรื่องสิทธิ์** ผิดนิดเดียวคือช่องโหว่

- `update*` คืน true เมื่อ **เจอเอกสาร** ไม่ใช่ "แก้แล้วค่าเปลี่ยน"
  → Mongo ต้องใช้ `matchedCount` **ไม่ใช่** `modifiedCount`
  (ไม่งั้นบันทึกค่าเดิมซ้ำจะคืน false แล้ว UI ขึ้น error ผิด ๆ)
- ทุก query ของ `foodEntries` ต้องกรอง `userKey` ด้วย **ไม่ใช่กรองแค่ `entryId`**
  → นี่คือด่านตรวจสิทธิ์ตัวจริง ไม่ได้อยู่ที่ UI
- `findUser` คืน `null` เมื่อไม่พบ (ไม่ใช่ `undefined`)
- `listEntries` เรียงตาม `createdAt` เก่า→ใหม่
- `deleteDay` คืน **จำนวน** ที่ลบ ส่วน `deleteEntry` คืน boolean
- `insertUser` คืน false เมื่อชื่อซ้ำ และต้องเช็ค+เขียนเป็นก้อนเดียว
  (fileStore ใช้ `serialize()` · Mongo ใช้ unique index แล้วจับ error 11000)

## กับดัก fileStore: คีย์ที่ผู้ใช้พิมพ์

`users` ใช้ชื่อผู้ใช้เป็นคีย์ จึงต้องเป็น `Object.create(null)` และเช็คด้วย `Object.hasOwn`
ถ้าใช้ object ธรรมดา ชื่อ `__proto__` / `constructor` จะชน `Object.prototype`
(เคยเป็นบั๊กจริง: login โยน TypeError กลายเป็น 500 โดยไม่ต้องล็อกอิน)
Mongo ไม่มีปัญหานี้ — ดู `tests/store-prototype.test.ts`

## กับดักอื่น

- `date` เป็น **string** `YYYY-MM-DD` ตามเวลาไทย ไม่ใช่ `Date` — ใช้ `todayKey()` เสมอ
- timestamp เป็น ISO string ไม่ใช่ `Date`
- Mongo ต้อง projection `{_id: 0}` และระบุ type ให้ `findOne<T>()` / `find<T>()`
  ไม่งั้น `ObjectId` จะไม่ตรงกับ type และหลุดข้าม boundary ไปหา client ไม่ได้
- ค่าที่ส่งมาจาก client เป็น **`unknown`** เสมอ — server action รับอะไรก็ได้
  ตรวจ `typeof x === "object" && x !== null` ก่อนอ่านฟิลด์
- ประวัติอาหาร **ถ่ายสำเนา** ชื่อ/ตัวเลขไว้ ไม่ join กับ `FOODS` — อย่าเปลี่ยนเป็น join

## เพิ่มฟิลด์ในเอกสารที่มีข้อมูลอยู่แล้ว

`VALIDATORS` ตั้ง `additionalProperties: false` และมี `required`
เพิ่มฟิลด์เป็น **required** ทันทีจะทำให้เอกสารเก่าอัปเดตไม่ผ่าน
ให้เพิ่มเป็น optional ก่อน → backfill → แล้วค่อยเลื่อนเป็น required
`db:setup` ใช้ `collMod` อัปเดต validator ของ collection ที่มีอยู่แล้วให้เอง

## ตรวจงาน

```bash
bun test tests/food-log.test.ts tests/auth.test.ts tests/store-prototype.test.ts
bun run db:setup     # สร้าง/อัปเดต collection + index (รันซ้ำได้)
bun run db:parity    # ยิง MongoDB จริง เทียบพฤติกรรมกับ fileStore 31 เคส
bun run verify
```

`db:setup` และ `db:parity` **ต้องรันด้วย Node ไม่ใช่ Bun** (bson เรียก `node:v8`
ที่ Bun ยังไม่รองรับ) — สคริปต์ใน package.json จัดการให้แล้ว
