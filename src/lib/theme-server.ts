/**
 * หาธีมที่ควรใช้สำหรับคำขอนี้ — ใช้ทั้งใน layout (ใส่ data-theme บน <html>)
 * และใน page (ส่งให้ปุ่มสลับธีมรู้ว่าตอนนี้เลือกอะไรอยู่)
 * ทั้งสองที่ต้องได้ค่าเดียวกัน ไม่งั้นปุ่มจะไฮไลต์ผิดสี
 */

import "server-only";

import { cookies } from "next/headers";

import { getCurrentUser } from "./auth";
import {
  asThemeName,
  isThemeName,
  THEME_COOKIE,
  type ThemeName,
} from "./theme";

export async function resolveTheme(): Promise<ThemeName> {
  // cookie มาก่อน เพราะผู้ใช้อาจเพิ่งกดเปลี่ยนไปเมื่อกี้
  const fromCookie = (await cookies()).get(THEME_COOKIE)?.value;
  if (isThemeName(fromCookie)) return fromCookie;

  // ไม่มี cookie (เครื่องใหม่ หรือเพิ่งล้างข้อมูล) — ใช้ที่จำไว้ในบัญชี
  const user = await getCurrentUser();
  return asThemeName(user?.theme);
}
