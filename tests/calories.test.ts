import { describe, expect, test } from "bun:test";

import {
  ACTIVITIES,
  calculate,
  parseProfile,
  profileKey,
  type Profile,
} from "@/lib/calories";

const base: Profile = {
  gender: "female",
  age: 30,
  weight: 60,
  height: 165,
  activity: "light",
  goal: "maintain",
};

describe("calculate", () => {
  test("BMR ตรงตามสูตร Mifflin-St Jeor ของผู้หญิง", () => {
    // 10(60) + 6.25(165) − 5(30) − 161 = 1320.25
    expect(calculate(base).bmr).toBe(1320);
  });

  test("BMR ของผู้ชายสูงกว่าผู้หญิงที่ตัวเลขเดียวกัน 166 kcal", () => {
    const female = calculate(base).bmr;
    const male = calculate({ ...base, gender: "male" }).bmr;
    expect(male - female).toBe(166);
  });

  test("TDEE = BMR × ตัวคูณกิจกรรม", () => {
    const result = calculate(base);
    expect(result.tdee).toBe(Math.round(result.bmr * 1.375));
  });

  test("เป้าหมายคงน้ำหนักเท่ากับ TDEE", () => {
    const result = calculate(base);
    expect(result.target).toBe(result.tdee);
  });

  test("ลดน้ำหนักตัด 20% เพิ่มน้ำหนักบวก 15%", () => {
    const maintain = calculate(base).tdee;
    expect(calculate({ ...base, goal: "lose" }).target).toBe(
      Math.round(maintain * 0.8),
    );
    expect(calculate({ ...base, goal: "gain" }).target).toBe(
      Math.round(maintain * 1.15),
    );
  });

  test("ตัวคูณกิจกรรมยิ่งสูง แคลอรี่ยิ่งเพิ่มตามลำดับ", () => {
    const targets = ACTIVITIES.map(
      (item) => calculate({ ...base, activity: item.key }).target,
    );
    const sorted = [...targets].sort((a, b) => a - b);
    expect(targets).toEqual(sorted);
    expect(new Set(targets).size).toBe(ACTIVITIES.length);
  });

  test("ไม่ให้เป้าหมายต่ำกว่าขั้นต่ำที่ปลอดภัย", () => {
    const tiny = calculate({
      ...base,
      age: 60,
      weight: 40,
      height: 145,
      activity: "sedentary",
      goal: "lose",
    });
    expect(tiny.target).toBe(1200);
    expect(tiny.floored).toBe(true);
    expect(calculate(base).floored).toBe(false);
  });

  test("แคลอรี่จากสารอาหารสามหมู่รวมกันได้เท่าเป้าหมาย", () => {
    for (const goal of ["lose", "maintain", "gain"] as const) {
      const { macros, target } = calculate({ ...base, goal });
      const percent =
        macros.protein.percent + macros.carbs.percent + macros.fat.percent;
      const kcal = macros.protein.kcal + macros.carbs.kcal + macros.fat.kcal;

      expect(percent).toBe(100);
      expect(Math.abs(kcal - target)).toBeLessThanOrEqual(2);
    }
  });

  test("แปลงกรัมจากแคลอรี่ถูกต้อง โปรตีน/คาร์บ 4 ไขมัน 9", () => {
    const { macros } = calculate(base);
    expect(macros.protein.grams).toBe(Math.round(macros.protein.kcal / 4));
    expect(macros.carbs.grams).toBe(Math.round(macros.carbs.kcal / 4));
    expect(macros.fat.grams).toBe(Math.round(macros.fat.kcal / 9));
  });

  test("BMI และคำอธิบายตามเกณฑ์เอเชีย", () => {
    expect(calculate(base).bmi).toBe(22);
    expect(calculate(base).bmiLabel).toBe("สมส่วนกำลังดี");

    expect(calculate({ ...base, weight: 45 }).bmiLabel).toBe("ผอมกว่าเกณฑ์");
    expect(calculate({ ...base, weight: 65 }).bmiLabel).toBe("ท้วมเล็กน้อย");
    expect(calculate({ ...base, weight: 75 }).bmiLabel).toBe("น้ำหนักเกิน");
    expect(calculate({ ...base, weight: 95 }).bmiLabel).toBe("อ้วนระดับสูง");
  });

  test("ตำแหน่งบนแถบ BMI อยู่ในช่วง 0–100 เสมอ", () => {
    for (const weight of [30, 60, 120, 240]) {
      const { bmiPosition } = calculate({ ...base, weight });
      expect(bmiPosition).toBeGreaterThanOrEqual(0);
      expect(bmiPosition).toBeLessThanOrEqual(100);
    }
  });

  test("ช่วงน้ำหนักที่เหมาะสมสอดคล้องกับ BMI 18.5–22.9", () => {
    const { idealMin, idealMax } = calculate(base);
    expect(idealMin).toBeCloseTo(18.5 * 1.65 * 1.65, 1);
    expect(idealMax).toBeCloseTo(22.9 * 1.65 * 1.65, 1);
  });

  test("ปริมาณน้ำคิดจาก 33 มล./กก.", () => {
    expect(calculate(base).water).toBe(1.98);
  });
});

describe("parseProfile", () => {
  test("รับค่าที่เป็นสตริงจากช่องกรอกได้", () => {
    expect(
      parseProfile({
        gender: "female",
        age: "30",
        weight: "60",
        height: "165",
        activity: "light",
        goal: "maintain",
      }),
    ).toEqual(base);
  });

  test("ปฏิเสธค่าที่อยู่นอกช่วงหรือกรอกไม่ครบ", () => {
    expect(parseProfile({ ...base, age: 5 })).toBeNull();
    expect(parseProfile({ ...base, age: 200 })).toBeNull();
    expect(parseProfile({ ...base, weight: 0 })).toBeNull();
    expect(parseProfile({ ...base, height: 500 })).toBeNull();
    expect(parseProfile({ ...base, weight: "" })).toBeNull();
    expect(parseProfile({ ...base, height: "abc" })).toBeNull();
    expect(parseProfile(null)).toBeNull();
    expect(parseProfile("nope")).toBeNull();
  });

  test("ค่าที่ไม่รู้จักถอยไปใช้ค่าปลอดภัย ไม่ทำให้พัง", () => {
    const parsed = parseProfile({
      ...base,
      gender: "อื่น",
      activity: "teleport",
      goal: "become-a-bird",
    });

    expect(parsed).not.toBeNull();
    expect(parsed!.gender).toBe("female");
    expect(parsed!.activity).toBe("light");
    expect(parsed!.goal).toBe("maintain");
  });
});

describe("profileKey", () => {
  test("ข้อมูลเหมือนกันได้คีย์เดียวกัน ต่างกันได้คีย์ต่างกัน", () => {
    expect(profileKey(base)).toBe(profileKey({ ...base }));
    expect(profileKey(base)).not.toBe(profileKey({ ...base, weight: 61 }));
    expect(profileKey(base)).not.toBe(profileKey({ ...base, goal: "lose" }));
  });
});
