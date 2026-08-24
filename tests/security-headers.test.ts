import { expect, test } from "bun:test";

import { SECURITY_HEADERS } from "@/lib/security-headers";

test("sends baseline protection headers without broad CORS", () => {
  expect(SECURITY_HEADERS).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        key: "X-Content-Type-Options",
        value: "nosniff",
      }),
      expect.objectContaining({ key: "Referrer-Policy" }),
      expect.objectContaining({ key: "Permissions-Policy" }),
      expect.objectContaining({ key: "Content-Security-Policy" }),
    ]),
  );
  expect(
    SECURITY_HEADERS.some(
      (header) => String(header.key) === "Access-Control-Allow-Origin",
    ),
  ).toBe(false);
});
