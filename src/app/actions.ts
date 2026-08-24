"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  authenticateUser,
  endSession,
  registerUser,
  saveUserProfile,
  saveUserTheme,
  startSession,
} from "@/lib/auth";
import {
  addEntry,
  clearDay,
  removeEntry,
  setServings,
} from "@/lib/food-log";
import {
  asThemeName,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  type ThemeName,
} from "@/lib/theme";
import type { MealSlot } from "@/lib/db/schema";

export interface AuthState {
  error?: string;
}

function readCredentials(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
}

/* -------------------------------------------------------------- สมาชิก */

export async function signUpAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { name, password } = readCredentials(formData);
  const outcome = await registerUser(name, password);

  if (!outcome.ok) return { error: outcome.error };

  await startSession(outcome.user.name, outcome.user.theme);
  revalidatePath("/");
  return {};
}

export async function signInAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { name, password } = readCredentials(formData);
  const outcome = await authenticateUser(name, password);

  if (!outcome.ok) return { error: outcome.error };

  await startSession(outcome.user.name, outcome.user.theme);
  revalidatePath("/");
  return {};
}

export async function signOutAction(): Promise<void> {
  await endSession();
  revalidatePath("/");
}

export async function saveProfileAction(
  profile: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const result = await saveUserProfile(profile);
  if (result.ok) revalidatePath("/");
  return result;
}

/* ---------------------------------------------------------------- ธีม */

export async function saveThemeAction(input: unknown): Promise<void> {
  const theme: ThemeName = asThemeName(input);

  // ตั้ง cookie ฝั่ง server ด้วย เพื่อให้ SSR ครั้งถัดไปได้สีตรงกัน
  (await cookies()).set(THEME_COOKIE, theme, {
    sameSite: "lax",
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE,
  });

  await saveUserTheme(theme);
}

/* ------------------------------------------------------ บันทึกมื้ออาหาร */

export async function addFoodAction(input: {
  date: string;
  meal: MealSlot;
  foodId: string;
  servings: number;
}): Promise<{ ok: boolean; error?: string }> {
  const result = await addEntry(input);
  if (result.ok) revalidatePath("/");
  return result;
}

export async function setServingsAction(
  entryId: string,
  servings: number,
): Promise<{ ok: boolean; error?: string }> {
  const result = await setServings(entryId, servings);
  if (result.ok) revalidatePath("/");
  return result;
}

export async function removeFoodAction(
  entryId: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await removeEntry(entryId);
  if (result.ok) revalidatePath("/");
  return result;
}

export async function clearDayAction(
  date: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await clearDay(date);
  if (result.ok) revalidatePath("/");
  return result;
}
