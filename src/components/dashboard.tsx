"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bike,
  Cake,
  Calculator,
  Check,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  LoaderCircle,
  LogOut,
  Minus,
  Ruler,
  Salad,
  Save,
  Scale,
  Sofa,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { saveProfileAction, signOutAction } from "@/app/actions";
import { FoodLog } from "@/components/food-log";
import { ResultsPanel } from "@/components/results-panel";
import { Segmented } from "@/components/segmented";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { ThemeName } from "@/lib/theme";
import type { LoggedEntry } from "@/lib/totals";
import {
  ACTIVITIES,
  GOALS,
  LIMITS,
  calculate,
  goalOf,
  parseProfile,
  profileKey,
  type ActivityKey,
  type Gender,
  type GoalKey,
  type Profile,
} from "@/lib/calories";
import { cn } from "@/lib/utils";

const ACTIVITY_ICON: Record<ActivityKey, LucideIcon> = {
  sedentary: Sofa,
  light: Footprints,
  moderate: Bike,
  active: Dumbbell,
  athlete: Flame,
};

const GOAL_ICON: Record<GoalKey, LucideIcon> = {
  lose: TrendingDown,
  maintain: Minus,
  gain: TrendingUp,
};

type View = "calc" | "log";

interface DashboardProps {
  name: string;
  savedProfile: Profile | null;
  theme: ThemeName;
  /** วันที่ของบันทึกมื้ออาหาร (เวลาไทย) */
  logDate: string;
  entries: LoggedEntry[];
}

export function Dashboard({
  name,
  savedProfile,
  theme,
  logDate,
  entries,
}: DashboardProps) {
  const [view, setView] = useState<View>("calc");
  const [gender, setGender] = useState<Gender>(savedProfile?.gender ?? "female");
  const [age, setAge] = useState(savedProfile ? String(savedProfile.age) : "");
  const [weight, setWeight] = useState(
    savedProfile ? String(savedProfile.weight) : "",
  );
  const [height, setHeight] = useState(
    savedProfile ? String(savedProfile.height) : "",
  );
  const [activity, setActivity] = useState<ActivityKey>(
    savedProfile?.activity ?? "light",
  );
  const [goal, setGoal] = useState<GoalKey>(savedProfile?.goal ?? "maintain");

  const [revealed, setRevealed] = useState(savedProfile !== null);
  const [savedKey, setSavedKey] = useState(
    savedProfile ? profileKey(savedProfile) : null,
  );
  const [savePending, startSave] = useTransition();
  const [signOutPending, startSignOut] = useTransition();

  const profile = useMemo(
    () => parseProfile({ gender, age, weight, height, activity, goal }),
    [gender, age, weight, height, activity, goal],
  );

  // ผลลัพธ์ของแท็บคำนวณ — โชว์หลังกดปุ่มคำนวณแล้วเท่านั้น
  const result = useMemo(
    () => (revealed && profile ? calculate(profile) : null),
    [revealed, profile],
  );

  // โควตาแคลอรี่ของแท็บบันทึกมื้อ — คิดจากข้อมูลร่างกายล้วน ๆ
  //
  // เคยเป็นบั๊ก: ตรงนี้ใช้ result ซึ่งผูกกับ revealed (state ของอีกแท็บ)
  // ถ้าผู้ใช้ยังไม่กด "คำนวณเลย" goal จะเป็น 0 แล้ว ratio ถูกล็อกที่ 0
  // ทำให้ตัวเลขที่กินไปขึ้นปกติ แต่หลอดค้างไม่ขยับตาม
  const budget = useMemo(
    () => (profile ? calculate(profile) : null),
    [profile],
  );

  // เทียบกับที่บันทึกไว้ พอแก้ข้อมูลปุ่มจะกลับมาให้กดบันทึกใหม่เอง
  const saved = profile !== null && savedKey === profileKey(profile);

  const handleSave = () => {
    if (!profile) return;
    startSave(async () => {
      const outcome = await saveProfileAction(profile);
      if (outcome.ok) setSavedKey(profileKey(profile));
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 26 }}
      className="mx-auto w-full max-w-5xl"
    >
      <Greeting
        name={name}
        theme={theme}
        pending={signOutPending}
        onSignOut={() => startSignOut(() => signOutAction())}
      />

      <div className="mt-5">
        <Segmented
          name="view"
          value={view}
          onChange={setView}
          options={[
            { value: "calc", label: "คำนวณเป้าหมาย", icon: Calculator },
            { value: "log", label: "บันทึกมื้อวันนี้", icon: UtensilsCrossed },
          ]}
        />
      </div>

      <AnimatePresence mode="wait">
      {view === "log" ? (
        <motion.div
          key="log"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="mt-5"
        >
          <FoodLog date={logDate} entries={entries} target={budget} />
        </motion.div>
      ) : (
        <motion.div
          key="calc"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_1fr] lg:items-start">
        <div className="space-y-4">
          <section className="rounded-3xl border border-brand-100 bg-white/80 p-5 shadow-soft backdrop-blur-xl sm:p-6">
            <SectionTitle icon={Heart}>ข้อมูลของคุณ</SectionTitle>

            <div className="mt-4 space-y-4">
              <Segmented
                name="gender"
                value={gender}
                onChange={setGender}
                options={[
                  { value: "female", label: "หญิง" },
                  { value: "male", label: "ชาย" },
                ]}
              />

              <div className="grid grid-cols-3 gap-2.5">
                <NumberField
                  icon={Cake}
                  label="อายุ"
                  unit="ปี"
                  value={age}
                  onChange={setAge}
                  limits={LIMITS.age}
                />
                <NumberField
                  icon={Scale}
                  label="น้ำหนัก"
                  unit="กก."
                  value={weight}
                  onChange={setWeight}
                  limits={LIMITS.weight}
                />
                <NumberField
                  icon={Ruler}
                  label="ส่วนสูง"
                  unit="ซม."
                  value={height}
                  onChange={setHeight}
                  limits={LIMITS.height}
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-brand-100 bg-white/80 p-5 shadow-soft backdrop-blur-xl sm:p-6">
            <SectionTitle icon={Bike}>ขยับตัวมากแค่ไหน</SectionTitle>
            <ActivityPicker value={activity} onChange={setActivity} />
          </section>

          <section className="rounded-3xl border border-brand-100 bg-white/80 p-5 shadow-soft backdrop-blur-xl sm:p-6">
            <SectionTitle icon={Salad}>เป้าหมาย</SectionTitle>

            <Segmented
              className="mt-4"
              name="goal"
              value={goal}
              onChange={setGoal}
              options={GOALS.map((item) => ({
                value: item.key,
                label: item.label,
                icon: GOAL_ICON[item.key],
              }))}
            />

            <div className="mt-3 min-h-9">
              <AnimatePresence mode="wait">
                <motion.p
                  key={goal}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-xl bg-brand-50/80 px-3 py-2 text-xs leading-relaxed text-ink-soft"
                >
                  {goalOf(goal).note}
                </motion.p>
              </AnimatePresence>
            </div>
          </section>

          <ActionRow
            ready={profile !== null}
            revealed={revealed}
            saved={saved}
            savePending={savePending}
            onCalculate={() => setRevealed(true)}
            onSave={handleSave}
          />
        </div>

        <div className="lg:sticky lg:top-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ type: "spring", stiffness: 200, damping: 26 }}
              >
                <ResultsPanel result={result} />
              </motion.div>
            ) : (
              <EmptyState key="empty" />
            )}
          </AnimatePresence>
        </div>
      </div>
        </motion.div>
      )}
      </AnimatePresence>

      <p className="mx-auto mt-8 max-w-md text-center text-[0.7rem] leading-relaxed text-ink-soft">
        ตัวเลขทั้งหมดเป็นค่าประมาณจากสูตร Mifflin-St Jeor
        <br />
        ไม่ใช่คำแนะนำทางการแพทย์ หากมีโรคประจำตัวควรปรึกษาแพทย์หรือนักโภชนาการ
      </p>
    </motion.div>
  );
}

/* ----------------------------------------------------------------- ส่วนหัว */

function Greeting({
  name,
  theme,
  pending,
  onSignOut,
}: {
  name: string;
  theme: ThemeName;
  pending: boolean;
  onSignOut: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-mark-from to-mark-to shadow-cta"
        >
          <Heart className="size-5 fill-mark-ink text-mark-ink" />
        </motion.div>

        <div className="min-w-0">
          <p className="truncate font-display text-lg leading-tight text-ink">
            สวัสดี {name}
          </p>
          <p className="text-xs text-brand-400">
            มาดูกันว่าวันนี้ควรกินเท่าไหร่
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeSwitcher current={theme} />

        <button
          type="button"
          onClick={onSignOut}
          disabled={pending}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-brand-100 bg-white/70 px-3.5 py-2 text-xs text-ink-soft backdrop-blur transition-all hover:border-brand-200 hover:text-brand-700 disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <LogOut className="size-3.5" />
          )}
          ออกจากระบบ
        </button>
      </div>
    </header>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 font-display text-sm text-ink">
      <Icon className="size-4 text-brand-400" />
      {children}
    </h2>
  );
}

/* ------------------------------------------------------------- ช่องตัวเลข */

function NumberField({
  icon: Icon,
  label,
  unit,
  value,
  onChange,
  limits,
}: {
  icon: LucideIcon;
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  limits: { min: number; max: number };
}) {
  const numeric = Number(value);
  const invalid =
    value !== "" &&
    (!Number.isFinite(numeric) || numeric < limits.min || numeric > limits.max);

  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs text-ink-soft">
        <Icon className="size-3.5 text-brand-300" />
        {label}
      </span>

      <div className="relative mt-1.5">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="–"
          aria-invalid={invalid}
          className={cn(
            "h-12 w-full rounded-2xl border bg-brand-50/50 pr-9 pl-3.5 font-display text-base text-ink transition-all duration-200 outline-none",
            "placeholder:font-sans placeholder:text-brand-300",
            "hover:border-brand-200 focus:bg-white focus:ring-4",
            invalid
              ? "border-destructive/40 focus:border-destructive/60 focus:ring-destructive/15"
              : "border-brand-100 focus:border-brand-300 focus:ring-brand-200/40",
          )}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[0.7rem] text-ink-soft">
          {unit}
        </span>
      </div>

      <AnimatePresence>
        {invalid && (
          <motion.span
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="block overflow-hidden text-[0.65rem] text-destructive"
          >
            {limits.min}–{limits.max}
          </motion.span>
        )}
      </AnimatePresence>
    </label>
  );
}

/* --------------------------------------------------------- ระดับกิจกรรม */

function ActivityPicker({
  value,
  onChange,
}: {
  value: ActivityKey;
  onChange: (value: ActivityKey) => void;
}) {
  return (
    <div role="radiogroup" className="mt-3 space-y-1.5">
      {ACTIVITIES.map((item) => {
        const active = item.key === value;
        const Icon = ACTIVITY_ICON[item.key];

        return (
          <button
            key={item.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(item.key)}
            className="relative flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            {active && (
              <motion.span
                layoutId="activity-pill"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-2xl bg-brand-50 ring-1 ring-brand-200"
              />
            )}

            <span
              className={cn(
                "relative grid size-9 shrink-0 place-items-center rounded-xl transition-colors duration-200",
                active
                  ? "bg-linear-to-br from-mark-from to-mark-to text-mark-ink"
                  : "bg-brand-50 text-brand-300",
              )}
            >
              <Icon className="size-4" />
            </span>

            <span className="relative min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-sm font-medium transition-colors duration-200",
                  active ? "text-brand-700" : "text-ink",
                )}
              >
                {item.label}
              </span>
              <span className="block truncate text-[0.7rem] text-ink-soft">
                {item.hint}
              </span>
            </span>

            <span
              className={cn(
                "relative shrink-0 font-display text-xs tabular-nums transition-colors duration-200",
                active ? "text-brand-500" : "text-brand-200",
              )}
            >
              ×{item.factor.toFixed(2)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ ปุ่ม */

function ActionRow({
  ready,
  revealed,
  saved,
  savePending,
  onCalculate,
  onSave,
}: {
  ready: boolean;
  revealed: boolean;
  saved: boolean;
  savePending: boolean;
  onCalculate: () => void;
  onSave: () => void;
}) {
  return (
    <div className="flex gap-2.5">
      <motion.button
        type="button"
        onClick={onCalculate}
        disabled={!ready}
        whileHover={{ scale: ready ? 1.015 : 1 }}
        whileTap={{ scale: ready ? 0.985 : 1 }}
        // ตอน disabled พื้นเป็นพาสเทลอ่อน ต้องสลับตัวอักษรเป็นสีเข้มด้วย
        // ไม่งั้นธีมที่ cta-ink เป็นสีขาวจะอ่านไม่ออกเลย
        className="group relative flex h-13 flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl bg-linear-to-r from-cta-from to-cta-to font-display text-sm text-cta-ink shadow-cta transition-shadow hover:shadow-cta-lg disabled:cursor-not-allowed disabled:from-brand-100 disabled:to-brand-100 disabled:text-brand-800 disabled:shadow-none"
      >
        <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <Sparkles className="relative size-4" />
        <span className="relative">
          {ready
            ? revealed
              ? "คำนวณอีกครั้ง"
              : "คำนวณเลย"
            : "กรอกข้อมูลให้ครบก่อนนะ"}
        </span>
      </motion.button>

      <AnimatePresence>
        {revealed && ready && (
          <motion.button
            type="button"
            onClick={onSave}
            disabled={savePending || saved}
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            whileTap={{ scale: saved ? 1 : 0.96 }}
            className={cn(
              "flex h-13 shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl border px-4 text-sm transition-colors",
              saved
                ? "border-fresh bg-fresh/40 text-[#1f7a56]"
                : "border-brand-200 bg-white/70 text-brand-700 hover:bg-brand-50",
            )}
          >
            {savePending ? (
              <LoaderCircle className="size-4 shrink-0 animate-spin" />
            ) : saved ? (
              <Check className="size-4 shrink-0" />
            ) : (
              <Save className="size-4 shrink-0" />
            )}
            <span className="whitespace-nowrap">
              {saved ? "บันทึกแล้ว" : "บันทึก"}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------- ยังไม่มีผลลัพธ์ */

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="grid min-h-88 place-items-center rounded-3xl border border-dashed border-brand-200 bg-white/50 p-8 text-center backdrop-blur-xl"
    >
      <div>
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, 4, 0, -4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto grid size-20 place-items-center rounded-full bg-brand-50"
        >
          <Salad className="size-9 text-brand-300" />
        </motion.div>

        <p className="mt-5 font-display text-base text-ink">
          ยังไม่มีผลลัพธ์
        </p>
        <p className="mx-auto mt-1.5 max-w-56 text-xs leading-relaxed text-ink-soft">
          กรอกอายุ น้ำหนัก ส่วนสูง แล้วกดคำนวณ
          เดี๋ยวเราจัดตัวเลขสวย ๆ ให้เลย
        </p>

        <p className="mt-4 font-display text-xs text-brand-300">0 kcal</p>
      </div>
    </motion.div>
  );
}
