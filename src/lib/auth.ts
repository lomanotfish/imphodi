/**
 * ระบบสมาชิก — ขอแค่ "ชื่อ" กับ "รหัส"
 *
 * - รหัสผ่าน hash ด้วย scrypt + salt สุ่มรายคน ไม่เคยเก็บเป็น plain text
 * - session เป็น cookie เซ็นด้วย HMAC จึงไม่ต้องเก็บ state ฝั่ง server
 * - การอ่าน/เขียนข้อมูลไปผ่าน DataStore ทั้งหมด (ดู ./db/store.ts)
 */

import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";

import { parseProfile, type Profile } from "./calories";
import {
  asThemeName,
  DEFAULT_THEME,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  type ThemeName,
} from "./theme";
import { emptyUser, getStore } from "./db/store";

const scrypt = promisify(crypto.scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const DATA_DIR = path.join(process.cwd(), "data");
const SECRET_FILE = path.join(DATA_DIR, ".secret");

const COOKIE_NAME = "imphodi_session";
const SESSION_DAYS = 30;
const KEY_LENGTH = 64;

export const NAME_RULE = { min: 2, max: 24 } as const;
export const PASSWORD_RULE = { min: 8, max: 72 } as const;

export interface PublicUser {
  name: string;
  profile: Profile | null;
  theme: ThemeName;
}

/* ----------------------------------------------------------------- secret */

let secretPromise: Promise<string> | null = null;

function loadSecret(): Promise<string> {
  // เคลียร์ช่องเมื่อล้ม ไม่ให้ promise ที่ reject ค้างอยู่ตลอดอายุ process
  // (เช่นเขียน data/.secret ไม่ได้เพราะ filesystem อ่านได้อย่างเดียว)
  secretPromise ??= (async () => {
    const fromEnv = process.env.AUTH_SECRET;
    if (fromEnv && fromEnv.length >= 32) return fromEnv;

    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set in production");
    }

    try {
      const saved = (await fs.readFile(SECRET_FILE, "utf8")).trim();
      if (saved.length >= 32) return saved;
    } catch {
      // ยังไม่มี — สร้างใหม่ด้านล่าง
    }

    const generated = crypto.randomBytes(48).toString("base64url");
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(SECRET_FILE, generated, "utf8");
    return generated;
  })().catch((error: unknown) => {
    secretPromise = null;
    throw error;
  });

  return secretPromise;
}

/* ------------------------------------------------------------------ names */

export function normalizeName(input: string): string {
  return input.normalize("NFC").trim().replace(/\s+/g, " ");
}

function userKey(name: string): string {
  return normalizeName(name).toLocaleLowerCase("th-TH");
}

export function validateName(input: string): string | null {
  const name = normalizeName(input);
  if (name.length < NAME_RULE.min) {
    return `ชื่อต้องมีอย่างน้อย ${NAME_RULE.min} ตัวอักษรนะ`;
  }
  if (name.length > NAME_RULE.max) {
    return `ชื่อยาวได้ไม่เกิน ${NAME_RULE.max} ตัวอักษร`;
  }
  // \p{M} จำเป็นสำหรับภาษาไทย สระและวรรณยุกต์เป็น combining mark ไม่ใช่ \p{L}
  if (!/^[\p{L}\p{M}\p{N}_\-. ]+$/u.test(name)) {
    return "ชื่อใช้ได้เฉพาะตัวอักษร ตัวเลข และ _ - .";
  }
  return null;
}

export function validatePassword(input: string): string | null {
  if (input.length < PASSWORD_RULE.min) {
    return `รหัสต้องมีอย่างน้อย ${PASSWORD_RULE.min} ตัวอักษร`;
  }
  if (input.length > PASSWORD_RULE.max) {
    return `รหัสยาวได้ไม่เกิน ${PASSWORD_RULE.max} ตัวอักษร`;
  }
  return null;
}

/* --------------------------------------------------------------- password */

async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return { salt, passwordHash: derived.toString("hex") };
}

async function verifyPassword(
  password: string,
  record: { salt: string; passwordHash: string },
): Promise<boolean> {
  const derived = await scrypt(password, record.salt, KEY_LENGTH);
  const stored = Buffer.from(record.passwordHash, "hex");
  if (stored.length !== derived.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

/* ---------------------------------------------------------------- session */

async function sign(payload: string): Promise<string> {
  const secret = await loadSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

export async function startSession(
  name: string,
  theme: ThemeName = DEFAULT_THEME,
): Promise<void> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = Buffer.from(
    JSON.stringify({ u: userKey(name), exp: expires }),
  ).toString("base64url");

  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${await sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });

  // พาธีมที่เคยเลือกไว้กลับมาด้วย ให้หน้าตาเหมือนเดิมทุกเครื่อง
  store.set(THEME_COOKIE, theme, {
    sameSite: "lax",
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** nameKey ของผู้ใช้ที่ล็อกอินอยู่ หรือ null */
export async function getSessionKey(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;

  const payload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);

  const expected = await sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const { u, exp } = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { u?: unknown; exp?: unknown };

    if (typeof u !== "string" || typeof exp !== "number") return null;
    if (Date.now() > exp) return null;
    return u;
  } catch {
    return null;
  }
}

/**
 * ผู้ใช้ที่ล็อกอินอยู่ตอนนี้ หรือ null ถ้ายังไม่ได้ล็อกอิน
 * ห่อด้วย cache() เพราะทั้ง layout และ page เรียกในคำขอเดียวกัน
 * จะได้อ่านฐานข้อมูลครั้งเดียวต่อหนึ่ง request
 */
export const getCurrentUser = cache(
  async (): Promise<PublicUser | null> => {
    const key = await getSessionKey();
    if (!key) return null;

    const user = await getStore().findUser(key);
    if (!user) return null;

    return {
      name: user.name,
      profile: user.profile,
      theme: asThemeName(user.theme),
    };
  },
);

/* -------------------------------------------------------------- throttle */

// จำกัดจำนวนครั้งที่เดารหัสผิด เก็บในหน่วยความจำของ process
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const LOCK_MS = 5 * 60 * 1000;

function throttleCheck(key: string): string | null {
  const entry = attempts.get(key);
  if (!entry) return null;
  if (Date.now() > entry.until) {
    attempts.delete(key);
    return null;
  }
  if (entry.count >= MAX_ATTEMPTS) {
    const minutes = Math.ceil((entry.until - Date.now()) / 60000);
    return `ลองผิดหลายครั้งเกินไป รออีก ${minutes} นาทีแล้วลองใหม่นะ`;
  }
  return null;
}

function throttleFail(key: string): void {
  const entry = attempts.get(key);
  if (entry && Date.now() <= entry.until) {
    entry.count += 1;
    entry.until = Date.now() + LOCK_MS;
  } else {
    attempts.set(key, { count: 1, until: Date.now() + LOCK_MS });
  }
}

/* ----------------------------------------------------------------- public */

export type AuthOutcome =
  | { ok: true; user: PublicUser }
  | { ok: false; error: string };

export async function registerUser(
  rawName: string,
  password: string,
): Promise<AuthOutcome> {
  const nameError = validateName(rawName);
  if (nameError) return { ok: false, error: nameError };

  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, error: passwordError };

  const name = normalizeName(rawName);
  const nameKey = userKey(name);

  const credentials = await hashPassword(password);

  // ให้ store เป็นคนตัดสินว่าชื่อซ้ำไหม ในการเขียนครั้งเดียว
  // ถ้าเช็คก่อนแล้วค่อยเขียน สองคำขอพร้อมกันจะแทรกกันได้
  const created = await getStore().insertUser(
    emptyUser({ nameKey, name, ...credentials }),
  );

  if (!created) {
    return { ok: false, error: "ชื่อนี้มีคนใช้แล้ว ลองชื่ออื่นนะ" };
  }

  return {
    ok: true,
    user: { name, profile: null, theme: DEFAULT_THEME },
  };
}

export async function authenticateUser(
  rawName: string,
  password: string,
): Promise<AuthOutcome> {
  const name = normalizeName(rawName);
  const key = userKey(name);

  const locked = throttleCheck(key);
  if (locked) return { ok: false, error: locked };

  const user = await getStore().findUser(key);
  const wrong = "ชื่อหรือรหัสไม่ถูกต้อง ลองอีกครั้งนะ";

  if (!user) {
    // ทำ hash หลอกไว้ ให้เวลาตอบใกล้เคียงกรณีมีผู้ใช้จริง
    await scrypt(password, "missing-user-placeholder", KEY_LENGTH);
    throttleFail(key);
    return { ok: false, error: wrong };
  }

  if (!(await verifyPassword(password, user))) {
    throttleFail(key);
    return { ok: false, error: wrong };
  }

  attempts.delete(key);
  return {
    ok: true,
    user: {
      name: user.name,
      profile: user.profile,
      theme: asThemeName(user.theme),
    },
  };
}

/** บันทึกข้อมูลร่างกายล่าสุด ไว้เติมให้อัตโนมัติครั้งถัดไป */
export async function saveUserProfile(
  input: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const key = await getSessionKey();
  if (!key) return { ok: false, error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };

  const profile = parseProfile(input);
  if (!profile) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const updated = await getStore().updateUser(key, { profile });
  return updated ? { ok: true } : { ok: false, error: "ไม่พบผู้ใช้" };
}

/** จำธีมไว้ในบัญชี เพื่อให้เปิดจากเครื่องอื่นก็ได้สีเดิม */
export async function saveUserTheme(theme: ThemeName): Promise<void> {
  const key = await getSessionKey();
  if (!key) return;
  await getStore().updateUser(key, { theme });
}
