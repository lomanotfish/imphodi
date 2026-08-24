import { expect, test } from "bun:test";

async function runProductionSecretTest(authSecret?: string) {
  const child = Bun.spawn(
    [process.execPath, "test", "./tests/auth-secret-production.ts"],
    {
      cwd: process.cwd(),
      env: {
        NODE_ENV: "production",
        AUTH_SECRET_CASE: authSecret === undefined ? "unset" : "short",
        ...(authSecret === undefined ? {} : { AUTH_SECRET: authSecret }),
      },
    },
  );

  expect(await child.exited).toBe(0);
}

test("rejects session signing with a short production auth secret", async () => {
  await runProductionSecretTest("too-short");
});

test("rejects session signing with no production auth secret", async () => {
  await runProductionSecretTest();
});
