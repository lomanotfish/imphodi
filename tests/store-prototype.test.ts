import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * บั๊กที่เคยเกิด (ยืนยันด้วยการรันจริง):
 *
 * fileStore เก็บผู้ใช้บน object ธรรมดาโดยใช้ "ชื่อที่ผู้ใช้พิมพ์" เป็นคีย์
 * ชื่อ `__proto__` และ `constructor` จึงไปชนคีย์ที่สืบทอดจาก Object.prototype
 *
 *   - registerUser("__proto__") ตอบว่า "ชื่อนี้มีคนใช้แล้ว" ทั้งที่ไม่มีใครใช้
 *   - authenticateUser("__proto__") โยน TypeError จาก scrypt เพราะ salt เป็น
 *     undefined กลายเป็น 500 หลุดออกจาก server action โดยไม่ต้องล็อกอินก่อน
 *
 * แก้ที่ชั้น store (Object.create(null) + Object.hasOwn) ไม่ใช่ที่ validateName
 * เพราะเป็นปัญหาของโครงสร้างข้อมูล ไม่ใช่ของกฎการตั้งชื่อ
 */

const jar = new Map<string, string>();

mock.module("server-only", () => ({}));
mock.module("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) =>
      jar.has(key) ? { name: key, value: jar.get(key)! } : undefined,
    set: (key: string, value: string) => void jar.set(key, value),
    delete: (key: string) => void jar.delete(key),
  }),
}));

let auth: typeof import("@/lib/auth");
let store: typeof import("@/lib/db/store");
let workdir: string;
let origin: string;

/** ชื่อที่ตรงกับคีย์บน Object.prototype */
const PROTOTYPE_NAMES = ["__proto__", "constructor", "toString", "valueOf"];

beforeAll(async () => {
  origin = process.cwd();
  workdir = await fs.mkdtemp(path.join(os.tmpdir(), "imphodi-proto-"));
  process.chdir(workdir);

  // บังคับใช้ fileStore ไม่ให้ไปแตะ Mongo จริง
  delete process.env.MONGODB_URI;

  store = await import("@/lib/db/store");
  store.resetStore();
  auth = await import("@/lib/auth");
});

afterAll(async () => {
  process.chdir(origin);
  await fs.rm(workdir, { recursive: true, force: true }).catch(() => {});
});

describe("ชื่อผู้ใช้ที่ตรงกับคีย์บน Object.prototype", () => {
  test("store ใช้ fileStore ในเทสต์นี้", () => {
    expect(store.storeKind()).toBe("file");
  });

  test("findUser คืน null ไม่ใช่ของที่สืบทอดมาจาก prototype", async () => {
    for (const name of PROTOTYPE_NAMES) {
      expect(await store.getStore().findUser(name)).toBeNull();
    }
  });

  test("สมัครด้วยชื่อเหล่านี้ได้จริง ไม่ถูกบอกว่าชื่อซ้ำ", async () => {
    for (const name of PROTOTYPE_NAMES) {
      const outcome = await auth.registerUser(name, "secret123");
      expect(outcome.ok).toBe(true);
    }
  });

  test("ล็อกอินไม่โยน error และรหัสถูก/ผิดแยกกันได้", async () => {
    for (const name of PROTOTYPE_NAMES) {
      // ต้องไม่ throw — ก่อนแก้บั๊กจะได้ TypeError จาก scrypt
      const good = await auth.authenticateUser(name, "secret123");
      expect(good.ok).toBe(true);

      const bad = await auth.authenticateUser(name, "wrong-password");
      expect(bad.ok).toBe(false);
    }
  });

  test("สมัครซ้ำชื่อเดิมถูกปฏิเสธอย่างถูกต้อง", async () => {
    const outcome = await auth.registerUser("__proto__", "secret123");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toContain("มีคนใช้แล้ว");
  });

  test("ชื่อเหล่านี้ไม่ปนกัน แต่ละคนแยกบัญชีจริง", async () => {
    const a = await store.getStore().findUser("__proto__");
    const b = await store.getStore().findUser("constructor");

    expect(a?.name).toBe("__proto__");
    expect(b?.name).toBe("constructor");
    expect(a?.passwordHash).not.toBe(b?.passwordHash); // salt ต่างกัน
  });

  test("ข้อมูลที่เขียนลงไฟล์ไม่ทำให้ Object.prototype เปลี่ยน", async () => {
    // กัน prototype pollution จริง ๆ ไม่ใช่แค่เรื่องการค้นหา
    expect(
      ({} as Record<string, unknown>).polluted,
    ).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty("nameKey");
  });
});
