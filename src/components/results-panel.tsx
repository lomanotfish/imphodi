"use client";

import { motion } from "motion/react";
import { Droplets, Egg, Flame, HeartPulse, Scale, Wheat } from "lucide-react";

import { CountUp } from "@/components/count-up";
import type { Result } from "@/lib/calories";
import { cn } from "@/lib/utils";

// สีอ้างตัวแปรของธีม จึงเปลี่ยนตามธีมที่เลือกโดยไม่ต้อง re-render
const MACRO_STYLE = {
  protein: { label: "โปรตีน", color: "var(--macro-protein)", icon: Egg },
  carbs: { label: "คาร์บ", color: "var(--macro-carbs)", icon: Wheat },
  fat: { label: "ไขมัน", color: "var(--macro-fat)", icon: Droplets },
} as const;

type MacroKey = keyof typeof MACRO_STYLE;
const MACRO_ORDER: MacroKey[] = ["protein", "carbs", "fat"];

const BMI_TONE: Record<Result["bmiTone"], string> = {
  low: "bg-cool/60 text-[#6b52a8]",
  good: "bg-fresh/70 text-[#1f7a56]",
  mid: "bg-warm/70 text-[#a35a22]",
  high: "bg-brand-100 text-brand-700",
};

export function ResultsPanel({ result }: { result: Result }) {
  return (
    <div className="space-y-4">
      <CalorieRing result={result} />
      <MacroBreakdown result={result} />
      <BmiMeter result={result} />
      <SideStats result={result} />
    </div>
  );
}

/* --------------------------------------------------------------- โดนัทหลัก */

function CalorieRing({ result }: { result: Result }) {
  const size = 240;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const gap = 0.014;

  // ไล่จุดเริ่มของแต่ละส่วนต่อกันไปรอบวง
  const fractions = MACRO_ORDER.map((key) => result.macros[key].percent / 100);
  const segments = MACRO_ORDER.map((key, index) => ({
    key,
    offset: fractions.slice(0, index).reduce((sum, part) => sum + part, 0),
    length: Math.max(fractions[index] - gap, 0),
  }));

  return (
    <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-white/80 p-6 shadow-soft backdrop-blur-xl">
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--color-brand-50)"
              strokeWidth={stroke}
            />
            {segments.map((segment, index) => (
              <motion.circle
                key={segment.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={MACRO_STYLE[segment.key].color}
                strokeWidth={stroke}
                strokeLinecap="round"
                initial={{ pathLength: 0, pathOffset: segment.offset }}
                animate={{ pathLength: segment.length, pathOffset: segment.offset }}
                transition={{
                  duration: 1.1,
                  delay: 0.15 + index * 0.14,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            ))}
          </svg>

          <div className="absolute inset-0 grid place-items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 220, damping: 22 }}
              className="text-center"
            >
              <p className="text-[0.7rem] tracking-wide text-ink-soft">
                ควรกินวันละ
              </p>
              <p className="font-display text-[2.75rem] leading-none text-brand-600">
                <CountUp value={result.target} />
              </p>
              <p className="mt-1 text-xs text-ink-soft">กิโลแคลอรี่</p>
            </motion.div>
          </div>
        </div>

        {result.floored && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-4 rounded-xl bg-warm/50 px-3 py-2 text-center text-[0.7rem] leading-relaxed text-[#a35a22]"
          >
            ปรับขึ้นมาถึงขั้นต่ำที่ปลอดภัยแล้ว
            <br />
            กินน้อยกว่านี้ร่างกายจะขาดสารอาหารนะ
          </motion.p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ สารอาหารหลัก */

function MacroBreakdown({ result }: { result: Result }) {
  return (
    <div className="rounded-3xl border border-brand-100 bg-white/80 p-5 shadow-soft backdrop-blur-xl">
      <p className="font-display text-sm text-ink">สัดส่วนที่แนะนำต่อวัน</p>

      <div className="mt-4 space-y-3.5">
        {MACRO_ORDER.map((key, index) => {
          const macro = result.macros[key];
          const style = MACRO_STYLE[key];
          const Icon = style.icon;

          return (
            <div key={key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-ink">
                  <Icon className="size-4" style={{ color: style.color }} />
                  {style.label}
                </span>
                <span className="font-display tabular-nums text-ink">
                  <CountUp value={macro.grams} /> ก.
                  <span className="ml-1.5 text-xs font-normal text-ink-soft">
                    {macro.percent}%
                  </span>
                </span>
              </div>

              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-50">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${macro.percent}%` }}
                  transition={{
                    duration: 0.9,
                    delay: 0.25 + index * 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: style.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- BMI */

function BmiMeter({ result }: { result: Result }) {
  return (
    <div className="rounded-3xl border border-brand-100 bg-white/80 p-5 shadow-soft backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-sm text-ink">ค่า BMI ของคุณ</p>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            BMI_TONE[result.bmiTone],
          )}
        >
          {result.bmiLabel}
        </span>
      </div>

      <p className="mt-2 font-display text-3xl text-brand-600">
        <CountUp value={result.bmi} decimals={1} />
      </p>

      <div className="relative mt-4">
        <div
          className="h-2.5 rounded-full"
          style={{
            background:
              // แถบนี้สื่อความหมายสุขภาพ ไม่ใช่สีแบรนด์ จึงคงเดิมทุกธีม
              "linear-gradient(90deg, #cbb8f5 0%, #8fe0bd 28%, #ffd08a 55%, #f8a06a 78%, #e5484d 100%)",
          }}
        />
        <motion.div
          initial={{ left: "0%", opacity: 0 }}
          animate={{ left: `${result.bmiPosition}%`, opacity: 1 }}
          transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="absolute -top-1 size-4.5 -translate-x-1/2 rounded-full border-[3px] border-white bg-ink shadow-md"
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        น้ำหนักที่เหมาะกับส่วนสูงคุณคือ{" "}
        <span className="font-medium text-ink">
          {result.idealMin}–{result.idealMax} กก.
        </span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- สถิติเสริม */

function SideStats({ result }: { result: Result }) {
  const stats = [
    {
      icon: HeartPulse,
      label: "เผาผลาญพื้นฐาน",
      value: <CountUp value={result.bmr} />,
      unit: "kcal",
      hint: "BMR — ตอนนอนเฉย ๆ",
    },
    {
      icon: Flame,
      label: "ใช้จริงต่อวัน",
      value: <CountUp value={result.tdee} />,
      unit: "kcal",
      hint: "TDEE — รวมกิจกรรม",
    },
    {
      icon: Droplets,
      label: "น้ำที่ควรดื่ม",
      value: <CountUp value={result.water} decimals={1} />,
      unit: "ลิตร",
      hint: "ประมาณ 33 มล./กก.",
    },
    {
      icon: Scale,
      label: "ส่วนต่างจาก TDEE",
      value: (
        <>
          {result.target >= result.tdee ? "+" : "−"}
          <CountUp value={Math.abs(result.target - result.tdee)} />
        </>
      ),
      unit: "kcal",
      hint: "ตามเป้าหมายที่เลือก",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + index * 0.07, duration: 0.4 }}
          className="rounded-2xl border border-brand-100 bg-white/75 p-4 backdrop-blur-xl"
        >
          <stat.icon className="size-4 text-brand-400" />
          <p className="mt-2 text-[0.7rem] leading-tight text-ink-soft">
            {stat.label}
          </p>
          <p className="mt-0.5 font-display text-lg text-ink tabular-nums">
            {stat.value}
            <span className="ml-1 text-[0.7rem] font-normal text-ink-soft">
              {stat.unit}
            </span>
          </p>
          <p className="mt-1 text-[0.65rem] text-brand-300">{stat.hint}</p>
        </motion.div>
      ))}
    </div>
  );
}
