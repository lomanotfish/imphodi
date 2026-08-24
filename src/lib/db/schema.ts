/**
 * รูปร่างข้อมูลกลาง — ใช้ร่วมกันทั้ง file store (ตอนนี้) และ MongoDB (อนาคต)
 *
 * ทุกอย่างในไฟล์นี้เป็นแค่ type กับค่าคงที่ ไม่มีการต่อฐานข้อมูล
 * จึง import ได้จากทุกที่ และย้ายไป MongoDB ได้โดยไม่ต้องแก้ตรงนี้
 *
 * วิธีย้ายไป MongoDB ดูที่ท้ายไฟล์
 */

import type { Profile } from "@/lib/calories";
import type { ThemeName } from "@/lib/theme";

export const COLLECTIONS = {
  users: "users",
  foodEntries: "foodEntries",
} as const;

/** มื้ออาหาร เรียงตามลำดับเวลาในหนึ่งวัน */
export const MEAL_SLOTS = [
  { key: "breakfast", label: "มื้อเช้า", emoji: "🌅" },
  { key: "lunch", label: "มื้อกลางวัน", emoji: "☀️" },
  { key: "dinner", label: "มื้อเย็น", emoji: "🌙" },
  { key: "snack", label: "ของว่าง", emoji: "🍪" },
] as const;

export type MealSlot = (typeof MEAL_SLOTS)[number]["key"];

export function isMealSlot(value: unknown): value is MealSlot {
  return MEAL_SLOTS.some((slot) => slot.key === value);
}

export function mealLabel(slot: MealSlot): string {
  return MEAL_SLOTS.find((item) => item.key === slot)?.label ?? slot;
}

/* ------------------------------------------------------------------ users */

export interface UserDoc {
  /** MongoDB จะใส่ _id ให้เอง — file store ไม่ใช้ฟิลด์นี้ */
  _id?: string;
  /** ชื่อที่ normalize แล้ว (lowercase) ใช้เป็นกุญแจค้นหา — unique */
  nameKey: string;
  /** ชื่อตามที่ผู้ใช้พิมพ์ ใช้แสดงผล */
  name: string;
  salt: string;
  passwordHash: string;
  /** ข้อมูลร่างกายล่าสุด null ถ้ายังไม่เคยบันทึก */
  profile: Profile | null;
  theme: ThemeName;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------ foodEntries */

/**
 * หนึ่งเอกสารต่อหนึ่งรายการที่กิน (ไม่ใช่หนึ่งเอกสารต่อวัน)
 * แบบนี้เพิ่ม/ลบรายการเดียวได้โดยไม่ต้องอ่านทั้งวันมาเขียนทับ
 * และ query ข้ามช่วงวันได้ตรง ๆ เวลาจะทำกราฟย้อนหลัง
 *
 * ชื่อกับตัวเลขถูก "ถ่ายสำเนา" ไว้ตอนบันทึก ไม่ได้ join กับตารางเมนู
 * เพราะถ้าแก้ข้อมูลเมนูในอนาคต ประวัติที่กินไปแล้วต้องไม่เปลี่ยนตาม
 */
export interface FoodEntryDoc {
  _id?: string;
  /** id ของรายการ ใช้อ้างตอนลบ/แก้จำนวน */
  entryId: string;
  /** nameKey ของเจ้าของรายการ */
  userKey: string;
  /** วันที่แบบ YYYY-MM-DD ตามเวลาไทย */
  date: string;
  meal: MealSlot;
  /** id ในตารางเมนู เก็บไว้อ้างอิง อาจไม่มีอยู่แล้วในอนาคต */
  foodId: string;
  /** สำเนาชื่อและหน่วยเสิร์ฟตอนที่บันทึก */
  name: string;
  serving: string;
  servings: number;
  /** ค่าที่คูณจำนวนเสิร์ฟแล้ว */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
}

/** รูปแบบวันที่ที่ยอมรับ */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is string {
  return typeof value === "string" && DATE_PATTERN.test(value);
}

export const SERVINGS_LIMIT = { min: 0.5, max: 20 } as const;

/* ------------------------------------------------------ ข้อมูลสำหรับ Mongo */

/**
 * ดัชนีที่ต้องสร้างตอนย้ายไป MongoDB
 * ใช้กับ db.collection(name).createIndexes(spec) ได้ตรง ๆ
 */
export const INDEXES = {
  users: [
    { key: { nameKey: 1 }, name: "nameKey_unique", unique: true },
  ],
  foodEntries: [
    // ดัชนีหลัก — ดึงรายการของผู้ใช้ในวันเดียว
    { key: { userKey: 1, date: -1 }, name: "user_date" },
    // ลบ/แก้รายการเดียว
    { key: { entryId: 1 }, name: "entryId_unique", unique: true },
  ],
} as const;

/**
 * ตัวตรวจความถูกต้องระดับฐานข้อมูล ($jsonSchema)
 * ใส่ตอน createCollection เพื่อกันข้อมูลเพี้ยนเข้าไปตั้งแต่ชั้น DB
 */
export const VALIDATORS = {
  users: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nameKey", "name", "salt", "passwordHash", "createdAt"],
      properties: {
        nameKey: { bsonType: "string", minLength: 2, maxLength: 24 },
        name: { bsonType: "string", minLength: 2, maxLength: 24 },
        salt: { bsonType: "string" },
        passwordHash: { bsonType: "string" },
        profile: { bsonType: ["object", "null"] },
        theme: { enum: ["pink", "blue", "yellow"] },
        createdAt: { bsonType: "string" },
        updatedAt: { bsonType: "string" },
      },
    },
  },
  foodEntries: {
    $jsonSchema: {
      bsonType: "object",
      required: ["entryId", "userKey", "date", "meal", "foodId", "name", "servings", "kcal"],
      properties: {
        entryId: { bsonType: "string" },
        userKey: { bsonType: "string" },
        date: { bsonType: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
        meal: { enum: ["breakfast", "lunch", "dinner", "snack"] },
        foodId: { bsonType: "string" },
        name: { bsonType: "string" },
        serving: { bsonType: "string" },
        servings: { bsonType: "double", minimum: 0.5, maximum: 20 },
        kcal: { bsonType: ["double", "int"], minimum: 0 },
        protein: { bsonType: ["double", "int"], minimum: 0 },
        carbs: { bsonType: ["double", "int"], minimum: 0 },
        fat: { bsonType: ["double", "int"], minimum: 0 },
        createdAt: { bsonType: "string" },
      },
    },
  },
} as const;

/*
 * ────────────────────────────────────────────────────────────────────
 *  ย้ายไป MongoDB ตอนไหนก็ทำสามขั้นนี้
 * ────────────────────────────────────────────────────────────────────
 *
 *  1) ติดตั้ง driver และตั้งค่า
 *       bun add mongodb
 *       # .env.local
 *       MONGODB_URI="mongodb+srv://..."
 *       MONGODB_DB="imphodi"
 *
 *  2) สร้างไฟล์ src/lib/db/mongo-store.ts ที่ export ออบเจ็กต์
 *     หน้าตาเดียวกับ DataStore ใน ./store.ts เช่น
 *
 *       import { MongoClient } from "mongodb";
 *       import { COLLECTIONS, INDEXES, type UserDoc } from "./schema";
 *
 *       const client = new MongoClient(process.env.MONGODB_URI!);
 *       const db = client.db(process.env.MONGODB_DB);
 *
 *       export const mongoStore: DataStore = {
 *         findUser: (nameKey) =>
 *           db.collection<UserDoc>(COLLECTIONS.users).findOne({ nameKey }),
 *         insertUser: async (doc) => {
 *           await db.collection<UserDoc>(COLLECTIONS.users).insertOne(doc);
 *         },
 *         listEntries: (userKey, date) =>
 *           db.collection<FoodEntryDoc>(COLLECTIONS.foodEntries)
 *             .find({ userKey, date }).toArray(),
 *         ...
 *       };
 *
 *     สร้างดัชนีครั้งเดียวตอน deploy ด้วย INDEXES ข้างบน
 *       await db.collection(COLLECTIONS.users).createIndexes([...INDEXES.users]);
 *
 *  3) สลับ store ที่ ./store.ts ฟังก์ชัน getStore() แค่บรรทัดเดียว
 *     โค้ดส่วนอื่นทั้งหมดไม่ต้องแก้ เพราะคุยกับ DataStore เท่านั้น
 *
 *  หมายเหตุ: ถ้า deploy บน serverless (Vercel/Lambda) ต้องแคช MongoClient
 *  ไว้ใน globalThis ไม่ให้เปิด connection ใหม่ทุก request
 */
