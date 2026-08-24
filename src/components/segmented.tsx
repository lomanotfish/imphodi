"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  icon?: LucideIcon;
}

interface SegmentedProps<T extends string> {
  /** ต้องไม่ซ้ำกันในหน้าเดียว ใช้ผูกอนิเมชั่นของตัวชี้ */
  name: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  columns?: number;
  className?: string;
}

/** ปุ่มเลือกแบบ pill พร้อมตัวชี้ที่เลื่อนตามอย่างนุ่มนวล */
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  columns,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid gap-1 rounded-2xl border border-brand-100 bg-brand-50/70 p-1.5",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative cursor-pointer rounded-xl px-3 py-2.5 text-center transition-colors duration-200 outline-none",
              "focus-visible:ring-2 focus-visible:ring-brand-300",
              active
                ? "text-brand-700"
                : "text-ink-soft hover:text-brand-700",
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${name}`}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-brand-100"
              />
            )}

            <span className="relative flex flex-col items-center gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {Icon && <Icon className="size-4" />}
                {option.label}
              </span>
              {option.hint && (
                <span className="text-[0.7rem] leading-tight opacity-75">
                  {option.hint}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
