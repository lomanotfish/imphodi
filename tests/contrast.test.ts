import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import { THEMES } from "@/lib/theme";

/**
 * ตรวจ contrast ของสีที่มีข้อความทับอยู่ ทุกธีม
 *
 * เคยมีบั๊กจริงสองรอบ:
 *  1) ปุ่มตอน disabled พื้นพาสเทลแต่ตัวอักษรขาว เหลือ 1.3:1 อ่านไม่ออกเลย
 *  2) ปุ่มตอนกดได้ ตัวอักษรขาวบนไล่สีสด เหลือ 2.2:1
 * เทสต์ชุดนี้กันไว้ไม่ให้ย้อนกลับมาอีก
 */

const CSS = fs.readFileSync(
  path.join(import.meta.dir, "..", "src", "app", "globals.css"),
  "utf8",
);

/** เกณฑ์ WCAG AA สำหรับข้อความขนาดปกติ */
const AA = 4.5;
/** เกณฑ์สำหรับกราฟิก/ไอคอนที่สื่อความหมาย */
const AA_GRAPHIC = 3;

function blockFor(name: string): string {
  const marker =
    name === "pink" ? ':root,\n[data-theme="pink"]' : `[data-theme="${name}"]`;
  const at = CSS.indexOf(marker);
  if (at === -1) throw new Error(`ไม่พบบล็อกของธีม ${name}`);
  const open = CSS.indexOf("{", at);
  return CSS.slice(open, CSS.indexOf("}", open));
}

function colorOf(block: string, token: string): string {
  const found = new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`).exec(block);
  if (!found) throw new Error(`ไม่พบตัวแปร ${token}`);
  return found[1];
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  );
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("ตัวช่วยคำนวณ contrast ถูกต้อง", () => {
  test("ค่าที่รู้คำตอบอยู่แล้ว", () => {
    // ดำบนขาวคือค่าสูงสุด 21:1
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
    // สีเดียวกันคือ 1:1
    expect(contrast("#ff6699", "#ff6699")).toBeCloseTo(1, 5);
  });
});

for (const theme of THEMES) {
  describe(`contrast ธีม ${theme.name} (${theme.label})`, () => {
    const block = blockFor(theme.name);

    test("ปุ่มหลักตอนกดได้ — ตัวอักษรอ่านชัดทั้งสองปลายของไล่สี", () => {
      const ink = colorOf(block, "--cta-ink");
      const light = contrast(colorOf(block, "--cta-from"), ink);
      const dark = contrast(colorOf(block, "--cta-to"), ink);

      expect(light).toBeGreaterThanOrEqual(AA);
      expect(dark).toBeGreaterThanOrEqual(AA);
    });

    test("ปุ่มหลักตอน disabled — พื้น brand-100 กับตัวอักษร brand-800", () => {
      const ratio = contrast(
        colorOf(block, "--brand-100"),
        colorOf(block, "--brand-800"),
      );
      expect(ratio).toBeGreaterThanOrEqual(AA);
    });

    test("ชิปหมวดที่เลือกอยู่ — พื้น brand-200 กับตัวอักษร brand-800", () => {
      const ratio = contrast(
        colorOf(block, "--brand-200"),
        colorOf(block, "--brand-800"),
      );
      expect(ratio).toBeGreaterThanOrEqual(AA);
    });

    test("ข้อความหลักและข้อความรองบนพื้นหลัง", () => {
      const background = colorOf(block, "--background");

      expect(
        contrast(background, colorOf(block, "--ink")),
      ).toBeGreaterThanOrEqual(AA);

      // ข้อความรองสีอ่อนกว่า แต่ยังต้องอ่านได้
      expect(
        contrast(background, colorOf(block, "--ink-soft")),
      ).toBeGreaterThanOrEqual(AA);
    });

    // brand-700/800 ใช้กับข้อความตัวเล็กได้ ต้องผ่าน 4.5
    test("ข้อความตัวเล็กสีแบรนด์บนการ์ดสีขาว", () => {
      for (const token of ["--brand-700", "--brand-800"]) {
        expect(contrast("#ffffff", colorOf(block, token))).toBeGreaterThanOrEqual(
          AA,
        );
      }
    });

    /**
     * brand-500/600 อ่อนเกินกว่าจะใช้กับข้อความตัวเล็ก
     * ในโค้ดจึงใช้แค่กับตัวเลขใหญ่ (30–44px) ซึ่งเกณฑ์คือ 3:1
     * ถ้าเผลอไปใช้กับข้อความตัวเล็กที่ไหน ให้เปลี่ยนเป็น brand-700
     */
    test("brand-600 ใช้ได้กับตัวเลขใหญ่ (เกณฑ์ 3:1)", () => {
      expect(
        contrast("#ffffff", colorOf(block, "--brand-600")),
      ).toBeGreaterThanOrEqual(AA_GRAPHIC);
    });

    /**
     * โลโก้เป็นกราฟิกตกแต่ง (มีชื่อแอปเป็นตัวหนังสืออยู่ใต้ภาพแล้ว)
     * จึงได้รับข้อยกเว้นจากเกณฑ์ 3:1 — เช็คแค่ว่าไม่ได้กลืนไปกับพื้น
     */
    test("โลโก้ยังเห็นรูปหัวใจอยู่ ไม่กลืนกับพื้น", () => {
      const ink = colorOf(block, "--mark-ink");
      expect(contrast(colorOf(block, "--mark-from"), ink)).toBeGreaterThan(1.8);
      expect(contrast(colorOf(block, "--mark-to"), ink)).toBeGreaterThan(1.8);
    });

    test("สีสารอาหารสามหมู่แยกออกจากกันและเห็นบนพื้นขาว", () => {
      const macros = [
        colorOf(block, "--macro-protein"),
        colorOf(block, "--macro-carbs"),
        colorOf(block, "--macro-fat"),
      ];

      // แต่ละสีต้องเห็นบนการ์ดขาว (เป็นกราฟิก ใช้เกณฑ์ 3:1)
      for (const color of macros) {
        expect(contrast("#ffffff", color)).toBeGreaterThanOrEqual(AA_GRAPHIC);
      }

      // และต้องไม่ใกล้กันจนแยกไม่ออกในโดนัทชาร์ต
      expect(new Set(macros).size).toBe(3);
    });
  });
}
