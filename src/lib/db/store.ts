/**
 * ชั้นเข้าถึงข้อมูล
 *
 * โค้ดส่วนอื่นเรียกผ่าน DataStore เท่านั้น ไม่รู้ว่าข้างล่างเป็นไฟล์หรือ MongoDB
 * ตอนนี้ใช้ไฟล์ JSON — ย้ายไป Mongo แล้วแก้แค่ getStore() (ดู ./schema.ts)
 */

import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_THEME, type ThemeName } from "@/lib/theme";
import type { Profile } from "@/lib/calories";
import { COLLECTIONS, type FoodEntryDoc, type UserDoc } from "./schema";
import { configureMongoSrvDns } from "./mongo-dns";

export interface DataStore {
  findUser(nameKey: string): Promise<UserDoc | null>;
  /**
   * คืน false ถ้า nameKey นี้มีคนใช้แล้ว
   * ต้องเช็คและเขียนเป็นก้อนเดียว (atomic) ไม่ใช่เช็คแล้วค่อยเขียน
   * ไม่งั้นสองคำขอที่มาพร้อมกันจะสมัครชื่อเดียวกันได้ทั้งคู่
   */
  insertUser(doc: UserDoc): Promise<boolean>;
  updateUser(
    nameKey: string,
    patch: Partial<Pick<UserDoc, "profile" | "theme">>,
  ): Promise<boolean>;

  listEntries(userKey: string, date: string): Promise<FoodEntryDoc[]>;
  /** หารายการเดียวโดยไม่ต้องรู้ว่าอยู่วันไหน — Mongo: findOne({entryId, userKey}) */
  findEntry(userKey: string, entryId: string): Promise<FoodEntryDoc | null>;
  insertEntry(doc: FoodEntryDoc): Promise<void>;
  /** คืน false ถ้าไม่พบรายการ หรือรายการนั้นไม่ใช่ของ userKey */
  updateEntryServings(
    userKey: string,
    entryId: string,
    servings: number,
    totals: Pick<FoodEntryDoc, "kcal" | "protein" | "carbs" | "fat">,
  ): Promise<boolean>;
  deleteEntry(userKey: string, entryId: string): Promise<boolean>;
  deleteDay(userKey: string, date: string): Promise<number>;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function emptyUser(
  fields: Pick<UserDoc, "nameKey" | "name" | "salt" | "passwordHash">,
): UserDoc {
  const stamp = nowIso();
  return {
    ...fields,
    profile: null,
    theme: DEFAULT_THEME,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/* ============================================================ file store */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

interface FileShape {
  [COLLECTIONS.users]: Record<string, UserDoc>;
  [COLLECTIONS.foodEntries]: FoodEntryDoc[];
}

/**
 * users ใช้ "ชื่อผู้ใช้" เป็นคีย์ ซึ่งผู้ใช้พิมพ์มาเอง
 *
 * ถ้าเก็บบน object ธรรมดา ชื่อ `__proto__` กับ `constructor` จะไปชน
 * Object.prototype แล้วทำให้ค้นเจอทั้งที่ไม่มีผู้ใช้จริง
 * (register บอกว่าชื่อซ้ำผิด ๆ และ login โยน TypeError เพราะ salt เป็น undefined)
 *
 * ใช้ prototype เป็น null จึงไม่มีคีย์ที่สืบทอดมาให้ชนตั้งแต่ต้น
 * และเช็คด้วย Object.hasOwn ทุกครั้ง
 */
function emptyUsers(): Record<string, UserDoc> {
  return Object.create(null) as Record<string, UserDoc>;
}

function emptyShape(): FileShape {
  return { users: emptyUsers(), foodEntries: [] };
}

async function read(): Promise<FileShape> {
  try {
    const parsed = JSON.parse(await fs.readFile(DB_FILE, "utf8")) as
      | Partial<FileShape>
      | null;

    if (!parsed || typeof parsed !== "object") return emptyShape();

    // ย้ายเข้ากล่องไร้ prototype — JSON.parse คืน object ที่มี prototype ปกติ
    const users = emptyUsers();
    if (parsed.users && typeof parsed.users === "object") {
      for (const [key, value] of Object.entries(parsed.users)) {
        users[key] = value;
      }
    }

    return {
      users,
      foodEntries: Array.isArray(parsed.foodEntries) ? parsed.foodEntries : [],
    };
  } catch {
    // ยังไม่มีไฟล์ หรือไฟล์เสีย — เริ่มจากฐานว่าง
    return emptyShape();
  }
}

async function write(data: FileShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, DB_FILE); // atomic
}

// ต่อคิวทุกการเขียน กันสองคำขอเขียนทับกันเอง
let queue: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => {});
  return next;
}

export const fileStore: DataStore = {
  async findUser(nameKey) {
    const { users } = await read();
    // hasOwn กัน key ที่สืบทอดมาจาก prototype
    return Object.hasOwn(users, nameKey) ? users[nameKey] : null;
  },

  async insertUser(doc) {
    return serialize(async () => {
      const data = await read();
      if (Object.hasOwn(data.users, doc.nameKey)) return false;

      data.users[doc.nameKey] = doc;
      await write(data);
      return true;
    });
  },

  async updateUser(nameKey, patch) {
    return serialize(async () => {
      const data = await read();
      const user = Object.hasOwn(data.users, nameKey)
        ? data.users[nameKey]
        : undefined;
      if (!user) return false;

      if ("profile" in patch) user.profile = patch.profile as Profile | null;
      if (patch.theme) user.theme = patch.theme as ThemeName;
      user.updatedAt = nowIso();

      await write(data);
      return true;
    });
  },

  async listEntries(userKey, date) {
    const data = await read();
    return data.foodEntries
      .filter((entry) => entry.userKey === userKey && entry.date === date)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async findEntry(userKey, entryId) {
    const data = await read();
    return (
      data.foodEntries.find(
        (item) => item.entryId === entryId && item.userKey === userKey,
      ) ?? null
    );
  },

  async insertEntry(doc) {
    await serialize(async () => {
      const data = await read();
      data.foodEntries.push(doc);
      await write(data);
    });
  },

  async updateEntryServings(userKey, entryId, servings, totals) {
    return serialize(async () => {
      const data = await read();
      const entry = data.foodEntries.find(
        (item) => item.entryId === entryId && item.userKey === userKey,
      );
      if (!entry) return false;

      entry.servings = servings;
      entry.kcal = totals.kcal;
      entry.protein = totals.protein;
      entry.carbs = totals.carbs;
      entry.fat = totals.fat;

      await write(data);
      return true;
    });
  },

  async deleteEntry(userKey, entryId) {
    return serialize(async () => {
      const data = await read();
      const before = data.foodEntries.length;
      data.foodEntries = data.foodEntries.filter(
        (item) => !(item.entryId === entryId && item.userKey === userKey),
      );

      if (data.foodEntries.length === before) return false;
      await write(data);
      return true;
    });
  },

  async deleteDay(userKey, date) {
    return serialize(async () => {
      const data = await read();
      const before = data.foodEntries.length;
      data.foodEntries = data.foodEntries.filter(
        (item) => !(item.userKey === userKey && item.date === date),
      );

      const removed = before - data.foodEntries.length;
      if (removed > 0) await write(data);
      return removed;
    });
  },
};

/* ================================================================ เลือก store */

/**
 * มี MONGODB_URI = ใช้ MongoDB, ไม่มี = ใช้ไฟล์ JSON
 *
 * แบบนี้ตอน dev ในเครื่องไม่ต้องมี Mongo ก็รันได้ แต่บนโปรดักชัน
 * (Vercel) ต้องตั้ง MONGODB_URI เพราะ filesystem ของ serverless ไม่ถาวร
 */
let active: DataStore | null = null;

export function getStore(): DataStore {
  if (active) return active;

  if (process.env.MONGODB_URI) {
    /**
     * ต้องตั้ง DNS ก่อนโหลด driver
     *
     * static import ถูก hoist ขึ้นบนสุดของโมดูลเสมอ ดังนั้นถ้าเรียก
     * configureMongoSrvDns() ข้างใน mongo-store.ts มันจะทำงาน "หลัง"
     * `mongodb` ถูกโหลดไปแล้ว ซึ่งสายเกินไปถ้า driver จับค่า resolver
     * ตอนโหลดโมดูล — อาการคือ querySrv ECONNREFUSED ทั้งที่ resolveSrv
     * ของเราเองทำงานได้ (เจอจริงบน Windows ที่ DNS ระบบชี้ 127.0.0.1)
     */
    configureMongoSrvDns();

    // require แบบ lazy เพื่อไม่ให้ driver ถูกโหลดตอนที่ไม่ได้ใช้
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mongoStore } = require("./mongo-store") as {
      mongoStore: DataStore;
    };
    active = mongoStore;
    return active;
  }

  /**
   * ล้มให้ดังตอนโปรดักชัน แบบเดียวกับ AUTH_SECRET
   *
   * ถ้าปล่อยให้ถอยไปใช้ไฟล์ JSON บน Vercel จะกลายเป็นพังแบบเงียบ ๆ:
   * filesystem อ่านได้แต่เขียนไม่ได้ ผู้ใช้สมัครไม่ได้ บันทึกอะไรไม่ได้
   * และข้อมูลที่เผลอลงไปได้ก็หายตอน instance ถูกรีไซเคิล
   * แจ้งตอนเริ่มดีกว่าให้ผู้ใช้ไปเจอ error ตอนกดปุ่ม
   */
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "MONGODB_URI must be set in production — the file store cannot persist on serverless",
    );
  }

  active = fileStore;
  return active;
}

/** ชื่อ store ที่กำลังใช้ ไว้โชว์ตอนรันสคริปต์/ตรวจสภาพ */
export function storeKind(): "mongodb" | "file" {
  return process.env.MONGODB_URI ? "mongodb" : "file";
}

/** ใช้ในเทสต์เท่านั้น ให้เลือก store ใหม่ได้หลังเปลี่ยน env */
export function resetStore(): void {
  active = null;
}
