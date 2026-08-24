import { describe, expect, mock, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { calculate, type Profile } from "@/lib/calories";
import type { LoggedEntry } from "@/lib/totals";

/**
 * บั๊กที่เคยเกิด: ตัวเลข "วันนี้กินไปแล้ว" ขึ้นถูก แต่หลอดวงแหวนไม่ขยับ
 *
 * สาเหตุจริงไม่ใช่เรื่องอนิเมชั่น — Dashboard ส่ง target ที่ผูกกับ state
 * `revealed` ของแท็บคำนวณ ถ้าผู้ใช้ยังไม่กดปุ่ม "คำนวณเลย" จะได้ target=null
 * แล้วใน BudgetCard `ratio = goal > 0 ? kcal/goal : 0` จึงถูกล็อกที่ 0 ตลอด
 *
 * เทสต์นี้อ่าน stroke-dasharray ที่ motion ปล่อยออกมาจริงตอน render
 * (ทำได้เพราะวงแหวนใช้ initial={false} จึง render ค่าเป้าหมายออกมาเลย)
 */

// FoodLog import server actions ซึ่งลากทั้ง next/headers + node:fs เข้ามา
// เทสต์นี้สนใจแค่การ render จึงตัด action ออกให้เป็นฟังก์ชันเปล่า
mock.module("@/app/actions", () => ({
  addFoodAction: async () => ({ ok: true }),
  setServingsAction: async () => ({ ok: true }),
  removeFoodAction: async () => ({ ok: true }),
  clearDayAction: async () => ({ ok: true }),
  saveThemeAction: async () => {},
}));

const { FoodLog } = await import("@/components/food-log");

const PROFILE: Profile = {
  gender: "female",
  age: 28,
  weight: 55,
  height: 162,
  activity: "moderate",
  goal: "lose",
};

const TARGET = calculate(PROFILE);

function entry(kcal: number, id = "e1"): LoggedEntry {
  return {
    entryId: id,
    meal: "lunch",
    foodId: "khao-man-kai",
    name: "ข้าวมันไก่",
    serving: "1 จาน",
    servings: 1,
    kcal,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
}

/** ค่าแรกของ stroke-dasharray ของวงแหวนความคืบหน้า = สัดส่วนที่กินไป */
function ringFraction(entries: LoggedEntry[], target = TARGET) {
  const html = renderToStaticMarkup(
    <FoodLog date="2026-08-24" entries={entries} target={target} />,
  );

  // วงแรกเป็นราง (ไม่มี dasharray) วงที่มี dasharray คือหลอดความคืบหน้า
  const found = [...html.matchAll(/stroke-dasharray="([\d.]+) 1"/g)];
  if (found.length === 0) return null;
  return { value: Number(found[0][1]), html };
}

describe("หลอดแคลอรี่วันนี้ขยับตามจำนวนที่กิน", () => {
  test("ยังไม่กินอะไร หลอดอยู่ที่ 0", () => {
    const ring = ringFraction([]);
    expect(ring).not.toBeNull();
    expect(ring!.value).toBe(0);
  });

  test("กินไปครึ่งหนึ่งของเป้า หลอดอยู่ราวครึ่งวง", () => {
    const half = Math.round(TARGET.target / 2);
    const ring = ringFraction([entry(half)]);

    expect(ring!.value).toBeGreaterThan(0.45);
    expect(ring!.value).toBeLessThan(0.55);
  });

  // นี่คือหัวใจของบั๊ก — กินเพิ่มแล้วหลอดต้องขยับ ไม่ใช่ค้างที่เดิม
  test("กินเพิ่มขึ้นเรื่อย ๆ หลอดต้องยาวขึ้นตาม", () => {
    const steps = [200, 600, 1000, 1400].map(
      (kcal) => ringFraction([entry(kcal)])!.value,
    );

    // ต้องเพิ่มขึ้นจริงทุกขั้น ไม่ใช่ค้างที่ 0
    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i]).toBeGreaterThan(steps[i - 1]);
    }
    expect(steps[0]).toBeGreaterThan(0);
  });

  test("หลายรายการรวมกันแล้วหลอดคิดจากยอดรวม", () => {
    const one = ringFraction([entry(600, "a")])!.value;
    const two = ringFraction([entry(600, "a"), entry(600, "b")])!.value;

    expect(two).toBeGreaterThan(one);
    expect(two).toBeCloseTo(one * 2, 2);
  });

  test("กินเกินเป้า หลอดตันที่เต็มวง ไม่ล้นออกไป", () => {
    const ring = ringFraction([entry(TARGET.target * 3)]);
    expect(ring!.value).toBe(1);
  });

  test("กินเกินเป้าแล้วเปลี่ยนเป็นสีเตือน", () => {
    const under = ringFraction([entry(100)])!.html;
    const over = ringFraction([entry(TARGET.target + 100)])!.html;

    expect(under).not.toContain("#e5484d");
    expect(over).toContain("#e5484d");
  });

  /**
   * ก่อนแก้บั๊ก Dashboard ส่ง target=null มาตอนที่ยังไม่กดคำนวณ
   * เคสนี้ยังต้องไม่ทำให้หน้าพัง และต้องบอกผู้ใช้ว่าให้ไปกรอกข้อมูลก่อน
   */
  test("ไม่มีเป้าหมาย ยังแสดงยอดที่กินได้และไม่พัง", () => {
    const html = renderToStaticMarkup(
      <FoodLog date="2026-08-24" entries={[entry(600)]} target={null} />,
    );

    expect(html).toContain("วันนี้กินไปแล้ว");
    expect(html).toContain("คำนวณเป้าหมาย");
    // ไม่มีเป้า จึงไม่ควรโชว์ "เหลืออีก"
    expect(html).not.toContain("เหลืออีก");
  });
});

/**
 * กันบั๊กเดิมที่ต้นทาง: โควตาของแท็บบันทึกมื้อต้องคิดจากข้อมูลร่างกายล้วน ๆ
 * ไม่ผูกกับการกดปุ่มคำนวณ
 */
describe("Dashboard ต้องไม่ผูกโควตากับ state ของแท็บคำนวณ", () => {
  test("ไฟล์ dashboard คิด budget แยกจาก revealed", async () => {
    const source = await Bun.file(
      new URL("../src/components/dashboard.tsx", import.meta.url),
    ).text();

    // budget ต้องไม่มี revealed อยู่ในนิพจน์เดียวกัน
    // [^;] ครอบ newline อยู่แล้ว จึงไม่ต้องใช้ flag s (ซึ่งต้องการ target es2018+)
    const budgetLine = /const budget = useMemo\(\s*\(\)\s*=>\s*\(([^;]*?)\),/.exec(
      source,
    );
    expect(budgetLine).not.toBeNull();
    expect(budgetLine![1]).not.toContain("revealed");

    // และ FoodLog ต้องรับ budget ไม่ใช่ result
    // ดึงมาแค่บรรทัดเดียว ไม่ต้อง assert ทั้งไฟล์ เวลาพังจะอ่านง่าย
    const foodLogProp = /<FoodLog[^>]*target=\{(\w+)\}/.exec(source)?.[1];
    expect(foodLogProp).toBe("budget");
  });
});
