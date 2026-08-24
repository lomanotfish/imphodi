/**
 * บันทึกมื้ออาหารรายวัน — ตรรกะฝั่ง server
 * ทุกฟังก์ชันเช็คเจ้าของรายการจาก session เสมอ ไม่เชื่อ id ที่ client ส่งมา
 */

import "server-only";

import { getSessionKey } from "./auth";
import { findFood } from "./foods";
import { getStore, newId, nowIso } from "./db/store";
import {
  isDateKey,
  isMealSlot,
  SERVINGS_LIMIT,
  type FoodEntryDoc,
} from "./db/schema";
import { round1, type LoggedEntry } from "./totals";

// ส่งต่อให้ที่อื่น import จากที่นี่ได้เหมือนเดิม
export type { DayTotals, LoggedEntry } from "./totals";
export { sumTotals } from "./totals";

type Outcome = { ok: true } | { ok: false; error: string };

const NO_SESSION = "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";

function normalizeServings(input: unknown): number | null {
  const value = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(value)) return null;

  // ล็อกเป็นครึ่งหน่วย ให้ตรงกับปุ่ม +/- ใน UI
  const snapped = Math.round(value * 2) / 2;
  if (snapped < SERVINGS_LIMIT.min || snapped > SERVINGS_LIMIT.max) return null;
  return snapped;
}

function toPublic(doc: FoodEntryDoc): LoggedEntry {
  return {
    entryId: doc.entryId,
    meal: doc.meal,
    foodId: doc.foodId,
    name: doc.name,
    serving: doc.serving,
    servings: doc.servings,
    kcal: doc.kcal,
    protein: doc.protein,
    carbs: doc.carbs,
    fat: doc.fat,
  };
}

/** รายการที่กินไปแล้วในวันนั้น คืนอาเรย์ว่างถ้ายังไม่ล็อกอิน */
export async function listDay(date: string): Promise<LoggedEntry[]> {
  if (!isDateKey(date)) return [];

  const key = await getSessionKey();
  if (!key) return [];

  const docs = await getStore().listEntries(key, date);
  return docs.map(toPublic);
}

export async function addEntry(input: {
  date: unknown;
  meal: unknown;
  foodId: unknown;
  servings: unknown;
}): Promise<Outcome> {
  const key = await getSessionKey();
  if (!key) return { ok: false, error: NO_SESSION };

  if (!isDateKey(input.date)) return { ok: false, error: "วันที่ไม่ถูกต้อง" };
  if (!isMealSlot(input.meal)) return { ok: false, error: "มื้อไม่ถูกต้อง" };

  const servings = normalizeServings(input.servings);
  if (servings === null) return { ok: false, error: "จำนวนไม่ถูกต้อง" };

  const food =
    typeof input.foodId === "string" ? findFood(input.foodId) : undefined;
  if (!food) return { ok: false, error: "ไม่พบเมนูนี้" };

  await getStore().insertEntry({
    entryId: newId(),
    userKey: key,
    date: input.date,
    meal: input.meal,
    foodId: food.id,
    // ถ่ายสำเนาไว้ ประวัติจะไม่เปลี่ยนถ้าแก้ข้อมูลเมนูในอนาคต
    name: food.name,
    serving: food.serving,
    servings,
    kcal: Math.round(food.kcal * servings),
    protein: round1(food.protein * servings),
    carbs: round1(food.carbs * servings),
    fat: round1(food.fat * servings),
    createdAt: nowIso(),
  });

  return { ok: true };
}

export async function setServings(
  entryId: unknown,
  servingsInput: unknown,
): Promise<Outcome> {
  const key = await getSessionKey();
  if (!key) return { ok: false, error: NO_SESSION };
  if (typeof entryId !== "string" || !entryId) {
    return { ok: false, error: "ไม่พบรายการ" };
  }

  const servings = normalizeServings(servingsInput);
  if (servings === null) return { ok: false, error: "จำนวนไม่ถูกต้อง" };

  const store = getStore();

  // ต้องรู้ว่าเดิมเป็นเมนูอะไร เพื่อคูณค่าใหม่จากค่าต่อหนึ่งเสิร์ฟ
  const found = await store.findEntry(key, entryId);
  if (!found) return { ok: false, error: "ไม่พบรายการ" };

  // ค่าที่บันทึกในรายการเป็นสำเนาถาวร จึงคิดต่อเสิร์ฟจากรายการเดิมเสมอ
  const perServing = {
    kcal: found.kcal / found.servings,
    protein: found.protein / found.servings,
    carbs: found.carbs / found.servings,
    fat: found.fat / found.servings,
  };

  const updated = await store.updateEntryServings(key, entryId, servings, {
    kcal: Math.round(perServing.kcal * servings),
    protein: round1(perServing.protein * servings),
    carbs: round1(perServing.carbs * servings),
    fat: round1(perServing.fat * servings),
  });

  return updated ? { ok: true } : { ok: false, error: "ไม่พบรายการ" };
}

export async function removeEntry(entryId: unknown): Promise<Outcome> {
  const key = await getSessionKey();
  if (!key) return { ok: false, error: NO_SESSION };
  if (typeof entryId !== "string" || !entryId) {
    return { ok: false, error: "ไม่พบรายการ" };
  }

  const removed = await getStore().deleteEntry(key, entryId);
  return removed ? { ok: true } : { ok: false, error: "ไม่พบรายการ" };
}

export async function clearDay(date: unknown): Promise<Outcome> {
  const key = await getSessionKey();
  if (!key) return { ok: false, error: NO_SESSION };
  if (!isDateKey(date)) return { ok: false, error: "วันที่ไม่ถูกต้อง" };

  await getStore().deleteDay(key, date);
  return { ok: true };
}

/** วันที่วันนี้ตามเวลาไทย รูปแบบ YYYY-MM-DD */
export function todayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
