import { expect, test } from "bun:test";

import {
  securityHeadersForEnvironment,
  SECURITY_HEADERS,
} from "@/lib/security-headers";

function cspValue(environment: "development" | "production") {
  const header = securityHeadersForEnvironment(environment).find(
    (item) => item.key === "Content-Security-Policy",
  );
  expect(header).toBeDefined();
  return header!.value;
}

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

test("allows React development eval without weakening production CSP", () => {
  expect(cspValue("development")).toContain("'unsafe-eval'");
  expect(cspValue("production")).not.toContain("'unsafe-eval'");
});
