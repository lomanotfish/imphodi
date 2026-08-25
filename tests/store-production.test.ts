import { expect, test } from "bun:test";

/**
 * บน Vercel filesystem เขียนไม่ได้และไม่ถาวร
 * ถ้า deploy โดยลืมตั้ง MONGODB_URI แล้วแอปถอยไปใช้ไฟล์ JSON เงียบ ๆ
 * ผู้ใช้จะสมัครไม่ได้และบันทึกอะไรไม่ได้ โดยไม่มีสัญญาณอะไรบอกตอน deploy
 *
 * getStore() จึงต้องล้มให้ดังตอน production เหมือนที่ AUTH_SECRET ทำ
 *
 * ต้องรันในลูกกระบวนการเพราะ NODE_ENV กับ store ที่เลือกไว้เป็น state ระดับโมดูล
 * และต้องส่ง env ชุดใหม่ (ไม่ spread process.env) ไม่งั้น MONGODB_URI จริงจะติดไปด้วย
 * แบบเดียวกับ tests/auth-secret.test.ts
 */
test("โปรดักชันที่ไม่มี MONGODB_URI ต้องล้มทันที ไม่ถอยไปใช้ไฟล์ JSON", async () => {
  const child = Bun.spawn(
    [process.execPath, "test", "./tests/store-production-child.ts"],
    {
      cwd: process.cwd(),
      env: { NODE_ENV: "production" },
    },
  );

  expect(await child.exited).toBe(0);
});
