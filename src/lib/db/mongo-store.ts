/**
 * DataStore ที่คุยกับ MongoDB
 *
 * จุดที่ต้องระวังที่สุดคือ "ความหมายของค่าที่คืน" ต้องตรงกับ fileStore เป๊ะ ๆ
 * เพราะชั้นบนใช้ค่าเหล่านี้ตัดสินเรื่องสิทธิ์:
 *
 *   - update* คืน true เมื่อ "เจอเอกสาร" (matchedCount) ไม่ใช่ "แก้แล้วเปลี่ยน"
 *     ถ้าใช้ modifiedCount การบันทึกค่าเดิมซ้ำจะคืน false แล้ว UI จะขึ้น error ผิด ๆ
 *   - ทุก query ของ foodEntries ต้องกรอง userKey ด้วยเสมอ ไม่ใช่กรองแค่ entryId
 *     ไม่งั้นผู้ใช้คนอื่นแก้/ลบรายการของเราได้
 */

import "server-only";

import { MongoClient, type Collection, type Db } from "mongodb";

import {
  COLLECTIONS,
  type FoodEntryDoc,
  type UserDoc,
} from "./schema";
import { configureMongoSrvDns } from "./mongo-dns";
import type { DataStore } from "./store";

/** เอกสารที่เก็บจริง — ตัด _id ออกเพราะ Mongo จัดการเอง */
type UserDocument = Omit<UserDoc, "_id">;
type EntryDocument = Omit<FoodEntryDoc, "_id">;

/* ------------------------------------------------------------- connection */

/**
 * Serverless เรียกฟังก์ชันซ้ำ ๆ บน process เดิม ถ้าเปิด client ใหม่ทุกครั้ง
 * connection pool จะบานจนชน limit ของ Atlas
 * เก็บ promise ไว้บน globalThis จึงอยู่รอดทั้ง cold-start reuse และ HMR ตอน dev
 */
const globalForMongo = globalThis as unknown as {
  __imphodiMongo?: Promise<MongoClient>;
};

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

function connect(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "ไม่ได้ตั้ง MONGODB_URI — ดูวิธีตั้งค่าใน .env.example",
    );
  }

  configureMongoSrvDns({ uri });

  globalForMongo.__imphodiMongo ??= new MongoClient(uri, {
    // กันคำขอค้างนานเกินไปบน serverless
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    maxPoolSize: 10,
    retryWrites: true,
  }).connect();

  return globalForMongo.__imphodiMongo;
}

export async function mongoDb(): Promise<Db> {
  const client = await connect();
  // ถ้าไม่ระบุชื่อ ใช้ชื่อที่ติดมากับ connection string
  return client.db(process.env.MONGODB_DB || undefined);
}

async function usersCollection(): Promise<Collection<UserDocument>> {
  return (await mongoDb()).collection<UserDocument>(COLLECTIONS.users);
}

async function entriesCollection(): Promise<Collection<EntryDocument>> {
  return (await mongoDb()).collection<EntryDocument>(COLLECTIONS.foodEntries);
}

/** ไม่ส่ง _id ออกไปข้างนอก ชั้นบนไม่ได้ใช้ และ ObjectId serialize ข้ามไป client ไม่ได้ */
const WITHOUT_ID = { projection: { _id: 0 } } as const;

/* ------------------------------------------------------------------ store */

export const mongoStore: DataStore = {
  async findUser(nameKey) {
    const users = await usersCollection();
    // ระบุ type ของผลลัพธ์ให้ driver รู้ว่า projection ตัด _id ออกแล้ว
    return await users.findOne<UserDocument>({ nameKey }, WITHOUT_ID);
  },

  async insertUser(doc) {
    const users = await usersCollection();
    const { _id: _ignored, ...document } = doc;

    try {
      await users.insertOne(document as UserDocument);
      return true;
    } catch (error) {
      // 11000 = ชนดัชนี unique ของ nameKey แปลว่ามีคนใช้ชื่อนี้แล้ว
      if (isDuplicateKey(error)) return false;
      throw error;
    }
  },

  async updateUser(nameKey, patch) {
    const users = await usersCollection();

    // สร้าง $set จากคีย์ที่ส่งมาเท่านั้น — profile: null ต้องถือว่า "ส่งมา"
    const set: Partial<UserDocument> = { updatedAt: new Date().toISOString() };
    if ("profile" in patch) set.profile = patch.profile ?? null;
    if (patch.theme) set.theme = patch.theme;

    const result = await users.updateOne({ nameKey }, { $set: set });

    // matchedCount ไม่ใช่ modifiedCount — บันทึกค่าเดิมซ้ำต้องนับว่าสำเร็จ
    return result.matchedCount > 0;
  },

  async listEntries(userKey, date) {
    const entries = await entriesCollection();
    return await entries
      .find<EntryDocument>({ userKey, date }, WITHOUT_ID)
      .sort({ createdAt: 1 }) // เก่าไปใหม่ ให้ตรงกับ fileStore
      .toArray();
  },

  async findEntry(userKey, entryId) {
    const entries = await entriesCollection();
    // กรอง userKey ด้วย ไม่ใช่แค่ entryId — นี่คือด่านตรวจสิทธิ์
    return await entries.findOne<EntryDocument>({ entryId, userKey }, WITHOUT_ID);
  },

  async insertEntry(doc) {
    const entries = await entriesCollection();
    const { _id: _ignored, ...document } = doc;
    await entries.insertOne(document as EntryDocument);
  },

  async updateEntryServings(userKey, entryId, servings, totals) {
    const entries = await entriesCollection();
    const result = await entries.updateOne(
      { entryId, userKey },
      {
        $set: {
          servings,
          kcal: totals.kcal,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
        },
      },
    );

    return result.matchedCount > 0;
  },

  async deleteEntry(userKey, entryId) {
    const entries = await entriesCollection();
    const result = await entries.deleteOne({ entryId, userKey });
    return result.deletedCount > 0;
  },

  async deleteDay(userKey, date) {
    const entries = await entriesCollection();
    const result = await entries.deleteMany({ userKey, date });
    return result.deletedCount;
  },
};

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

/** ปิด connection — ใช้ในสคริปต์ที่ต้องจบ process ไม่ต้องเรียกใน request */
export async function closeMongo(): Promise<void> {
  const pending = globalForMongo.__imphodiMongo;
  if (!pending) return;

  globalForMongo.__imphodiMongo = undefined;
  await (await pending).close();
}
