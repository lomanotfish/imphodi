/**
 * สูตรคำนวณแคลอรี่ — Mifflin-St Jeor + เกณฑ์ BMI สำหรับคนเอเชีย
 * ไฟล์นี้เป็น pure function ทั้งหมด ใช้ได้ทั้งฝั่ง server และ client
 */

export type Gender = "female" | "male";
export type ActivityKey =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "athlete";
export type GoalKey = "lose" | "maintain" | "gain";

export interface Profile {
  gender: Gender;
  age: number;
  weight: number; // กิโลกรัม
  height: number; // เซนติเมตร
  activity: ActivityKey;
  goal: GoalKey;
}

export const LIMITS = {
  age: { min: 13, max: 100 },
  weight: { min: 25, max: 250 },
  height: { min: 120, max: 220 },
} as const;

export const ACTIVITIES: {
  key: ActivityKey;
  label: string;
  hint: string;
  factor: number;
}[] = [
  {
    key: "sedentary",
    label: "แทบไม่ขยับ",
    hint: "นั่งทำงานเกือบทั้งวัน",
    factor: 1.2,
  },
  {
    key: "light",
    label: "เบา ๆ",
    hint: "ออกกำลังกาย 1–3 วัน/สัปดาห์",
    factor: 1.375,
  },
  {
    key: "moderate",
    label: "ปานกลาง",
    hint: "ออกกำลังกาย 3–5 วัน/สัปดาห์",
    factor: 1.55,
  },
  {
    key: "active",
    label: "ค่อนข้างหนัก",
    hint: "ออกกำลังกาย 6–7 วัน/สัปดาห์",
    factor: 1.725,
  },
  {
    key: "athlete",
    label: "หนักมาก",
    hint: "นักกีฬา หรือใช้แรงงานหนัก",
    factor: 1.9,
  },
];

export const GOALS: {
  key: GoalKey;
  label: string;
  note: string;
  adjust: number;
  macros: { protein: number; carbs: number; fat: number };
}[] = [
  {
    key: "lose",
    label: "ลดน้ำหนัก",
    note: "ลดลง 20% จากที่ใช้ต่อวัน ประมาณ 0.5 กก./สัปดาห์",
    adjust: -0.2,
    macros: { protein: 0.3, carbs: 0.4, fat: 0.3 },
  },
  {
    key: "maintain",
    label: "คงน้ำหนัก",
    note: "กินเท่าที่ร่างกายใช้ รักษาหุ่นให้นิ่ง",
    adjust: 0,
    macros: { protein: 0.25, carbs: 0.45, fat: 0.3 },
  },
  {
    key: "gain",
    label: "เพิ่มน้ำหนัก",
    note: "เพิ่มขึ้น 15% เน้นสร้างกล้ามแบบค่อยเป็นค่อยไป",
    adjust: 0.15,
    macros: { protein: 0.25, carbs: 0.5, fat: 0.25 },
  },
];

/** ขั้นต่ำที่ยังปลอดภัยต่อวัน กันไม่ให้เป้าหมายต่ำเกินไป */
const CALORIE_FLOOR: Record<Gender, number> = { female: 1200, male: 1500 };

export interface Macro {
  grams: number;
  kcal: number;
  percent: number;
}

export interface Result {
  bmr: number;
  tdee: number;
  target: number;
  /** true เมื่อเป้าหมายถูกดันขึ้นมาถึงขั้นต่ำที่ปลอดภัย */
  floored: boolean;
  bmi: number;
  bmiLabel: string;
  bmiTone: "low" | "good" | "mid" | "high";
  /** ตำแหน่ง 0–100 ของ BMI บนแถบวัด */
  bmiPosition: number;
  macros: { protein: Macro; carbs: Macro; fat: Macro };
  water: number; // ลิตร/วัน
  idealMin: number;
  idealMax: number;
}

export function activityFactor(key: ActivityKey): number {
  return ACTIVITIES.find((a) => a.key === key)?.factor ?? 1.2;
}

export function goalOf(key: GoalKey) {
  return GOALS.find((g) => g.key === key) ?? GOALS[1];
}

/** เกณฑ์ BMI แบบเอเชีย-แปซิฟิก ซึ่งใกล้เคียงคนไทยมากกว่าเกณฑ์สากล */
function classifyBmi(bmi: number): {
  label: string;
  tone: Result["bmiTone"];
} {
  if (bmi < 18.5) return { label: "ผอมกว่าเกณฑ์", tone: "low" };
  if (bmi < 23) return { label: "สมส่วนกำลังดี", tone: "good" };
  if (bmi < 25) return { label: "ท้วมเล็กน้อย", tone: "mid" };
  if (bmi < 30) return { label: "น้ำหนักเกิน", tone: "high" };
  return { label: "อ้วนระดับสูง", tone: "high" };
}

export function calculate(profile: Profile): Result {
  const { gender, age, weight, height, activity, goal } = profile;

  // Mifflin-St Jeor
  const base = 10 * weight + 6.25 * height - 5 * age;
  const bmr = Math.round(gender === "female" ? base - 161 : base + 5);

  const tdee = Math.round(bmr * activityFactor(activity));

  const g = goalOf(goal);
  const raw = Math.round(tdee * (1 + g.adjust));
  const floor = CALORIE_FLOOR[gender];
  const target = Math.max(raw, floor);

  const meters = height / 100;
  const bmi = weight / (meters * meters);
  const { label: bmiLabel, tone: bmiTone } = classifyBmi(bmi);

  const macro = (percent: number, kcalPerGram: number): Macro => {
    const kcal = Math.round(target * percent);
    return {
      kcal,
      grams: Math.round(kcal / kcalPerGram),
      percent: Math.round(percent * 100),
    };
  };

  return {
    bmr,
    tdee,
    target,
    floored: raw < floor,
    bmi: Math.round(bmi * 10) / 10,
    bmiLabel,
    bmiTone,
    // ไล่จาก BMI 15 ถึง 35 ให้เป็น 0–100 บนแถบวัด
    bmiPosition: Math.min(100, Math.max(0, ((bmi - 15) / 20) * 100)),
    macros: {
      protein: macro(g.macros.protein, 4),
      carbs: macro(g.macros.carbs, 4),
      fat: macro(g.macros.fat, 9),
    },
    water: Math.round(weight * 33) / 1000,
    idealMin: Math.round(18.5 * meters * meters * 10) / 10,
    idealMax: Math.round(22.9 * meters * meters * 10) / 10,
  };
}

/** คีย์ระบุตัวตนของโปรไฟล์ ใช้เทียบว่าข้อมูลตรงกับที่บันทึกไว้ไหม */
export function profileKey(profile: Profile): string {
  const { gender, age, weight, height, activity, goal } = profile;
  return [gender, age, weight, height, activity, goal].join("|");
}

/** ตรวจและปรับค่าให้อยู่ในช่วงที่รับได้ คืน null ถ้าข้อมูลใช้ไม่ได้ */
export function parseProfile(input: unknown): Profile | null {
  if (typeof input !== "object" || input === null) return null;
  const raw = input as Record<string, unknown>;

  const num = (v: unknown, { min, max }: { min: number; max: number }) => {
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n < min || n > max) return null;
    return Math.round(n * 10) / 10;
  };

  const age = num(raw.age, LIMITS.age);
  const weight = num(raw.weight, LIMITS.weight);
  const height = num(raw.height, LIMITS.height);
  if (age === null || weight === null || height === null) return null;

  const gender: Gender = raw.gender === "male" ? "male" : "female";
  const activity = ACTIVITIES.some((a) => a.key === raw.activity)
    ? (raw.activity as ActivityKey)
    : "light";
  const goal = GOALS.some((g) => g.key === raw.goal)
    ? (raw.goal as GoalKey)
    : "maintain";

  return { gender, age, weight, height, activity, goal };
}
