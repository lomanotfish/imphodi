import { expect, mock, test } from "bun:test";

const jar = new Map<string, string>();

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

const auth = await import("@/lib/auth");

test("rejects session signing without a valid production auth secret", async () => {
  if (process.env.AUTH_SECRET_CASE === "unset") {
    expect(process.env.AUTH_SECRET).toBeUndefined();
  } else {
    expect(process.env.AUTH_SECRET).toBe("too-short");
  }

  await expect(auth.startSession("tester")).rejects.toThrow(
    "AUTH_SECRET must be set in production",
  );
});
