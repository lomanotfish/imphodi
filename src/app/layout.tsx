import type { Metadata, Viewport } from "next";
import { Mitr, Noto_Sans_Thai } from "next/font/google";
import { resolveTheme } from "@/lib/theme-server";
import "./globals.css";

const display = Mitr({
  variable: "--font-display",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const body = Noto_Sans_Thai({
  variable: "--font-body",
  subsets: ["thai", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "อิ่มพอดี · คำนวณแคลอรี่ที่พอดีกับคุณ",
  description:
    "คำนวณแคลอรี่ที่ควรกินต่อวัน สัดส่วนโปรตีน คาร์บ ไขมัน และค่า BMI แบบง่าย ๆ ในหน้าเดียว",
};

export const viewport: Viewport = {
  themeColor: "#fffafc",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // หาธีมตอน SSR เลย จะไม่มีจังหวะสีกระพริบตอนโหลด
  const theme = await resolveTheme();

  return (
    <html
      lang="th"
      data-theme={theme}
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
