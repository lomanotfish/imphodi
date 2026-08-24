/**
 * รูปร่างรายการที่กิน และการรวมยอด
 * เป็น pure function ทั้งหมด จึง import ได้จากทั้ง server และ client
 * (แยกออกมาจาก food-log.ts เพราะไฟล์นั้นเป็น server-only)
 */

import type { MealSlot } from "./db/schema";

/** รายการที่กิน เท่าที่ client ต้องรู้ — ไม่มี userKey/date/createdAt */
export interface LoggedEntry {
  entryId: string;
  meal: MealSlot;
  foodId: string;
  name: string;
  serving: string;
  servings: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DayTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  count: number;
}

/** ปัดทศนิยมหนึ่งตำแหน่ง กันเลขยาวเฟะจากการคูณจำนวนเสิร์ฟ */
export const round1 = (value: number) => Math.round(value * 10) / 10;

export function sumTotals(entries: LoggedEntry[]): DayTotals {
  return entries.reduce<DayTotals>(
    (total, entry) => ({
      kcal: total.kcal + entry.kcal,
      protein: round1(total.protein + entry.protein),
      carbs: round1(total.carbs + entry.carbs),
      fat: round1(total.fat + entry.fat),
      count: total.count + 1,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, count: 0 },
  );
}
