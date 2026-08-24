import { expect, test } from "bun:test";

test("rejects session signing with a short production auth secret", async () => {
  const child = Bun.spawn(
    [process.execPath, "test", "./tests/auth-secret-production.ts"],
    { cwd: process.cwd() },
  );

  expect(await child.exited).toBe(0);
});
