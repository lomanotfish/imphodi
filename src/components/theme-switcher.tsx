"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";

import { saveThemeAction } from "@/app/actions";
import {
  THEMES,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  type ThemeName,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * เปลี่ยนธีมทันทีที่กด — ทาสีกับเขียน cookie เองเลย ไม่ต้องรอ server
 * แล้วค่อยยิง action ไปจำไว้ในบัญชี (ถ้าล็อกอินอยู่)
 */
export function ThemeSwitcher({ current }: { current: ThemeName }) {
  const [theme, setTheme] = useState<ThemeName>(current);

  // ทาธีมลง <html> และจำใน cookie ให้รอบหน้าที่โหลดได้สีเดิมตั้งแต่ SSR
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
  }, [theme]);

  const pick = (next: ThemeName) => {
    if (next === theme) return;
    setTheme(next);
    void saveThemeAction(next);
  };

  return (
    <div
      role="radiogroup"
      aria-label="เลือกธีมสี"
      className="flex items-center gap-1 rounded-full border border-brand-100 bg-white/70 p-1 backdrop-blur"
    >
      {THEMES.map((option) => {
        const active = option.name === theme;

        return (
          <button
            key={option.name}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`ธีมสี${option.label}`}
            title={`ธีมสี${option.label}`}
            onClick={() => pick(option.name)}
            className="relative grid size-7 cursor-pointer place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            {active && (
              <motion.span
                layoutId="theme-ring"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="absolute inset-0 rounded-full ring-2 ring-brand-400"
              />
            )}

            <span
              className={cn(
                "grid size-5 place-items-center rounded-full transition-transform duration-200",
                active ? "scale-100" : "scale-90 hover:scale-100",
              )}
              style={{ backgroundColor: option.dot }}
            >
              {/* จุดสีทั้งสามเป็นพาสเทล เครื่องหมายถูกสีเข้มจึงเห็นชัดกว่าสีขาว */}
              {active && <Check className="size-3 text-black/65" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
