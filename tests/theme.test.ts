import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_THEME,
  THEMES,
  asThemeName,
  isThemeName,
} from "@/lib/theme";

// อ่านจากตำแหน่งไฟล์เทสต์ ไม่พึ่ง cwd เพราะเทสต์อื่น chdir
const CSS = fs.readFileSync(
  path.join(import.meta.dir, "..", "src", "app", "globals.css"),
  "utf8",
);

describe("ตรวจชื่อธีม", () => {
  test("รับชื่อที่มีจริง ปฏิเสธชื่ออื่น", () => {
    expect(isThemeName("pink")).toBe(true);
    expect(isThemeName("blue")).toBe(true);
    expect(isThemeName("yellow")).toBe(true);

    expect(isThemeName("green")).toBe(false);
    expect(isThemeName("")).toBe(false);
    expect(isThemeName(null)).toBe(false);
    expect(isThemeName(123)).toBe(false);
  });

  test("ค่าที่ใช้ไม่ได้ถอยไปธีมเริ่มต้น ไม่โยน error", () => {
    expect(asThemeName("blue")).toBe("blue");
    expect(asThemeName("ไม่มีธีมนี้")).toBe(DEFAULT_THEME);
    expect(asThemeName(undefined)).toBe(DEFAULT_THEME);
    expect(asThemeName(null)).toBe(DEFAULT_THEME);
    expect(asThemeName({})).toBe(DEFAULT_THEME);
  });

  test("มีสามธีมตามที่ออกแบบ และชื่อไม่ซ้ำ", () => {
    expect(THEMES).toHaveLength(3);
    const names = THEMES.map((theme) => theme.name);
    expect(new Set(names).size).toBe(3);
    expect(names).toContain(DEFAULT_THEME);
  });
});

/**
 * ธีมกำหนดค่าจริงใน CSS ถ้าเพิ่มธีมใน THEMES แต่ลืมเขียน CSS
 * หน้าเว็บจะเพี้ยนแบบเงียบ ๆ เทสต์ชุดนี้กันไว้
 */
describe("ธีมทุกตัวถูกกำหนดใน globals.css ครบ", () => {
  // ตัวแปรที่ทุกธีมต้องมี ไม่งั้นสีจะตกไปใช้ของธีมอื่น
  const REQUIRED = [
    "--brand-50",
    "--brand-100",
    "--brand-200",
    "--brand-300",
    "--brand-400",
    "--brand-500",
    "--brand-600",
    "--brand-700",
    "--background",
    "--ink",
    "--ink-soft",
    "--accent-warm",
    "--accent-cool",
    "--accent-fresh",
    "--cta-from",
    "--cta-to",
    "--cta-ink",
    "--cta-shadow",
    "--macro-protein",
    "--macro-carbs",
    "--macro-fat",
  ];

  /** ตัดเอาเฉพาะเนื้อในบล็อกของธีมนั้น */
  function blockFor(name: string): string {
    const marker = `[data-theme="${name}"]`;
    const at = CSS.indexOf(marker);
    if (at === -1) return "";

    const open = CSS.indexOf("{", at);
    const close = CSS.indexOf("}", open);
    return CSS.slice(open, close);
  }

  for (const theme of THEMES) {
    test(`ธีม ${theme.name} (${theme.label}) มีตัวแปรครบ`, () => {
      const block = blockFor(theme.name);
      expect(block.length).toBeGreaterThan(0);

      const missing = REQUIRED.filter(
        (token) => !block.includes(`${token}:`),
      );
      expect(missing).toEqual([]);
    });

    test(`ธีม ${theme.name} มีสีจุดตัวอย่างเป็น hex`, () => {
      expect(theme.dot).toMatch(/^#[0-9a-f]{6}$/i);
    });
  }

  test("ธีมเริ่มต้นถูกกำหนดไว้ที่ :root ด้วย จะได้มีสีก่อนอ่าน cookie", () => {
    expect(CSS).toContain(":root,");
    expect(CSS).toContain(`[data-theme="${DEFAULT_THEME}"]`);
  });
});
