/**
 * ธีมสี — ใช้ได้ทั้งฝั่ง server และ client
 * ค่าจริงของสีอยู่ใน globals.css เลือกด้วย data-theme บน <html>
 */

export const THEMES = [
  { name: "pink", label: "ชมพู", dot: "#ff8cb4", wash: "#fff0f6" },
  { name: "blue", label: "ฟ้า", dot: "#5cb5fa", wash: "#eaf5ff" },
  { name: "yellow", label: "เหลือง", dot: "#fcc63f", wash: "#fff7e0" },
] as const;

export type ThemeName = (typeof THEMES)[number]["name"];

export const DEFAULT_THEME: ThemeName = "yellow";
export const THEME_COOKIE = "imphodi_theme";
/** cookie ธีมอยู่ได้หนึ่งปี ไม่ใช่ข้อมูลอ่อนไหวจึงไม่ต้อง httpOnly */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isThemeName(value: unknown): value is ThemeName {
  return THEMES.some((theme) => theme.name === value);
}

export function asThemeName(value: unknown): ThemeName {
  return isThemeName(value) ? value : DEFAULT_THEME;
}
