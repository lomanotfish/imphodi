import { expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const store = await import("@/lib/db/store");

/**
 * ถูกเรียกจาก tests/store-production.test.ts ในลูกกระบวนการ
 * ที่ตั้ง NODE_ENV=production และไม่มี MONGODB_URI
 */
test("getStore ล้มทันทีเมื่อโปรดักชันไม่มี MONGODB_URI", () => {
  expect(process.env.NODE_ENV).toBe("production");
  expect(process.env.MONGODB_URI).toBeUndefined();

  expect(() => store.getStore()).toThrow(
    "MONGODB_URI must be set in production",
  );
});
