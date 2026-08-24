import { expect, test } from "bun:test";

import { sanitizeMongoUri } from "../scripts/mongo-uri";

test("redacts MongoDB credentials from setup diagnostics", () => {
  expect(
    sanitizeMongoUri(
      "mongodb+srv://atlas-user:atlas-password@cluster.example.mongodb.net/app",
    ),
  ).toBe("mongodb+srv://****:****@cluster.example.mongodb.net/app");
});
