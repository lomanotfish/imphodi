import { describe, expect, test } from "bun:test";
import { INDEXES, VALIDATORS } from "@/lib/db/schema";

describe("MongoDB persistence contract", () => {
  test("rejects undeclared fields and requires complete food snapshots", () => {
    const food = VALIDATORS.foodEntries.$jsonSchema;
    expect(food.additionalProperties).toBe(false);
    expect(food.properties._id).toEqual({ bsonType: "objectId" });
    expect(food.required).toEqual(expect.arrayContaining([
      "entryId", "userKey", "date", "meal", "foodId", "name", "serving",
      "servings", "kcal", "protein", "carbs", "fat", "createdAt",
    ]));
  });

  test("uses unique identity plus owner/date indexes", () => {
    expect(INDEXES.users).toContainEqual(
      expect.objectContaining({ key: { nameKey: 1 }, unique: true }),
    );
    expect(INDEXES.foodEntries).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: { userKey: 1, date: -1 } }),
      expect.objectContaining({ key: { entryId: 1 }, unique: true }),
    ]));
  });
});
