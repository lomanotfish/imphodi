import { expect, test } from "bun:test";

import {
  assertValidatorRejects,
  isDocumentValidationError,
  unverifiedIndexNames,
} from "../scripts/db-setup-helpers";

test("verifies declared index keys, direction, and uniqueness", () => {
  const declarations = [
    { name: "user_date", key: { userKey: 1, date: -1 } },
    { name: "entryId_unique", key: { entryId: 1 }, unique: true },
  ] as const;

  expect(
    unverifiedIndexNames(declarations, [
      { name: "user_date", key: { userKey: 1, date: -1 } },
      { name: "entryId_unique", key: { entryId: 1 }, unique: true },
    ]),
  ).toEqual([]);

  expect(
    unverifiedIndexNames(declarations, [
      { name: "user_date", key: { userKey: 1, date: 1 } },
      { name: "entryId_unique", key: { entryId: 1 } },
    ]),
  ).toEqual(["user_date", "entryId_unique"]);
});

test("recognizes only MongoDB document validation error code 121", () => {
  expect(isDocumentValidationError({ code: 121 })).toBe(true);
  expect(isDocumentValidationError({ code: 11000 })).toBe(false);
  expect(isDocumentValidationError(new Error("network unavailable"))).toBe(false);
});

test("requires validation code 121 and always cleans up the probe", async () => {
  let cleanupCount = 0;

  await assertValidatorRejects(
    async () => {
      throw { code: 121 };
    },
    async () => {
      cleanupCount += 1;
    },
  );
  expect(cleanupCount).toBe(1);

  await expect(
    assertValidatorRejects(
      async () => {
        throw new Error("network unavailable");
      },
      async () => {
        cleanupCount += 1;
      },
    ),
  ).rejects.toThrow("network unavailable");
  expect(cleanupCount).toBe(2);

  await expect(
    assertValidatorRejects(
      async () => {},
      async () => {
        cleanupCount += 1;
      },
    ),
  ).rejects.toThrow("accepted an invalid probe");
  expect(cleanupCount).toBe(3);
});
