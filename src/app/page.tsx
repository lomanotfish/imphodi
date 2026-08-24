import { CalorieApp } from "@/components/calorie-app";
import { PrettyBackground } from "@/components/pretty-background";
import { getCurrentUser } from "@/lib/auth";
import { listDay, todayKey } from "@/lib/food-log";
import { resolveTheme } from "@/lib/theme-server";

export default async function Page() {
  // อ่าน cookie จึงเป็น dynamic render โดยอัตโนมัติ
  const user = await getCurrentUser();
  const date = todayKey();

  // ต้องใช้ตัวเดียวกับที่ layout ใช้ ไม่งั้นปุ่มสลับธีมจะไฮไลต์ผิดสี
  const theme = await resolveTheme();
  const entries = user ? await listDay(date) : [];

  return (
    <>
      <PrettyBackground />
      <CalorieApp user={user} theme={theme} logDate={date} entries={entries} />
    </>
  );
}
