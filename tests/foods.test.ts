import { describe, expect, test } from "bun:test";

import {
  FOODS,
  FOOD_CATEGORIES,
  categoryLabel,
  findFood,
  searchFoods,
} from "@/lib/foods";
import { sumTotals, type LoggedEntry } from "@/lib/totals";

describe("ฐานข้อมูลเมนู", () => {
  test("มีเมนูให้เลือกพอสมควร", () => {
    expect(FOODS.length).toBeGreaterThanOrEqual(60);
  });

  test("id ไม่ซ้ำกัน", () => {
    const ids = FOODS.map((food) => food.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // นี่คือกฎที่สำคัญที่สุดของไฟล์นี้ ถ้าพลาดแอปจะโชว์ตัวเลขที่ขัดกันเอง
  test("kcal ของทุกเมนูตรงกับมาโครตามสูตร 4/4/9", () => {
    const broken: string[] = [];

    for (const food of FOODS) {
      const computed = food.protein * 4 + food.carbs * 4 + food.fat * 9;
      if (Math.abs(computed - food.kcal) > 2) {
        broken.push(
          `${food.name}: เขียนไว้ ${food.kcal} แต่คำนวณได้ ${Math.round(computed)}`,
        );
      }
    }

    expect(broken).toEqual([]);
  });

  test("ไม่มีค่าติดลบ และทุกเมนูมีหน่วยเสิร์ฟกำกับ", () => {
    for (const food of FOODS) {
      expect(food.kcal).toBeGreaterThanOrEqual(0);
      expect(food.protein).toBeGreaterThanOrEqual(0);
      expect(food.carbs).toBeGreaterThanOrEqual(0);
      expect(food.fat).toBeGreaterThanOrEqual(0);
      expect(food.serving.length).toBeGreaterThan(0);
      expect(food.name.length).toBeGreaterThan(0);
    }
  });

  test("ทุกเมนูอยู่ในหมวดที่มีจริง และทุกหมวดมีเมนูอย่างน้อยหนึ่งอย่าง", () => {
    const known = new Set(FOOD_CATEGORIES.map((item) => item.key));

    for (const food of FOODS) {
      expect(known.has(food.category)).toBe(true);
    }

    for (const category of FOOD_CATEGORIES) {
      const inCategory = FOODS.filter((f) => f.category === category.key);
      expect(inCategory.length).toBeGreaterThan(0);
    }
  });

  test("findFood หาเจอเมื่อ id ถูก และคืน undefined เมื่อไม่มี", () => {
    expect(findFood("khao-man-kai")?.name).toBe("ข้าวมันไก่");
    expect(findFood("ไม่มีเมนูนี้")).toBeUndefined();
  });

  test("categoryLabel คืนชื่อไทยของหมวด", () => {
    expect(categoryLabel("fruit")).toBe("ผลไม้");
    expect(categoryLabel("drink")).toBe("เครื่องดื่ม");
  });
});

describe("searchFoods", () => {
  test("ค้นด้วยคำไทยเจอเมนูที่ตรง", () => {
    const found = searchFoods("ข้าวมันไก่", "all");
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].name).toContain("ข้าวมันไก่");
  });

  test("ค้นบางส่วนของชื่อก็เจอ", () => {
    expect(searchFoods("กะเพรา", "all").length).toBeGreaterThanOrEqual(2);
  });

  test("คำค้นว่างคืนทุกเมนูในหมวดนั้น", () => {
    expect(searchFoods("", "all")).toHaveLength(FOODS.length);

    const fruits = searchFoods("", "fruit");
    expect(fruits.length).toBeGreaterThan(0);
    expect(fruits.every((food) => food.category === "fruit")).toBe(true);
  });

  test("กรองหมวดร่วมกับคำค้นได้", () => {
    // "ข้าว" มีทั้งในหมวดจานเดียวและหมวดข้าว/แป้ง
    const onlyRice = searchFoods("ข้าว", "rice");
    expect(onlyRice.length).toBeGreaterThan(0);
    expect(onlyRice.every((food) => food.category === "rice")).toBe(true);
  });

  test("ไม่เจอก็คืนอาเรย์ว่าง ไม่พัง", () => {
    expect(searchFoods("zzzzไม่มีจริง", "all")).toEqual([]);
  });
});

describe("sumTotals", () => {
  const entry = (over: Partial<LoggedEntry> = {}): LoggedEntry => ({
    entryId: "e1",
    meal: "lunch",
    foodId: "khao-man-kai",
    name: "ข้าวมันไก่",
    serving: "1 จาน",
    servings: 1,
    kcal: 620,
    protein: 30,
    carbs: 80,
    fat: 20,
    ...over,
  });

  test("ไม่มีรายการได้ศูนย์ทั้งหมด", () => {
    expect(sumTotals([])).toEqual({
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      count: 0,
    });
  });

  test("รวมหลายรายการถูกต้อง", () => {
    const totals = sumTotals([
      entry(),
      entry({ entryId: "e2", kcal: 100, protein: 5, carbs: 10, fat: 3 }),
    ]);

    expect(totals.kcal).toBe(720);
    expect(totals.protein).toBe(35);
    expect(totals.carbs).toBe(90);
    expect(totals.fat).toBe(23);
    expect(totals.count).toBe(2);
  });

  test("ทศนิยมไม่บานปลายเป็นเลขยาว", () => {
    const totals = sumTotals([
      entry({ protein: 0.1, carbs: 0.2, fat: 0.3, kcal: 5 }),
      entry({ entryId: "e2", protein: 0.2, carbs: 0.1, fat: 0.3, kcal: 5 }),
    ]);

    expect(totals.protein).toBe(0.3);
    expect(totals.carbs).toBe(0.3);
    expect(String(totals.fat)).toBe("0.6");
  });
});
