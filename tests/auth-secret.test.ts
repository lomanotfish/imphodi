import { afterAll, expect, mock, test } from "bun:test";

const jar = new Map<string, string>();
const originalNodeEnv = process.env.NODE_ENV;
const originalAuthSecret = process.env.AUTH_SECRET;

mock.module("server-only", () => ({}));
mock.module("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) =>
      jar.has(key) ? { name: key, value: jar.get(key)! } : undefined,
    set: (key: string, value: string) => {
      jar.set(key, value);
    },
    delete: (key: string) => {
      jar.delete(key);
    },
  }),
}));

Object.assign(process.env, {
  NODE_ENV: "production",
  AUTH_SECRET: "too-short",
});

const auth = await import("@/lib/auth");

afterAll(() => {
  Object.assign(process.env, { NODE_ENV: originalNodeEnv });
  if (originalAuthSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalAuthSecret;
});

test("rejects session signing with a short production auth secret", async () => {
  await expect(auth.startSession("tester")).rejects.toThrow(
    "AUTH_SECRET must be set in production",
  );
});
