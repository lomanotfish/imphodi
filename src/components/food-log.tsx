"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Droplets,
  Egg,
  Flame,
  Minus,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
  Wheat,
  X,
} from "lucide-react";

import {
  addFoodAction,
  clearDayAction,
  removeFoodAction,
  setServingsAction,
} from "@/app/actions";
import { CountUp } from "@/components/count-up";
import { MEAL_SLOTS, type MealSlot } from "@/lib/db/schema";
import type { Result } from "@/lib/calories";
import {
  FOOD_CATEGORIES,
  searchFoods,
  type Food,
  type FoodCategory,
} from "@/lib/foods";
import { round1, sumTotals, type LoggedEntry } from "@/lib/totals";
import { cn } from "@/lib/utils";

interface FoodLogProps {
  date: string;
  entries: LoggedEntry[];
  /** เป้าหมายจากหน้าคำนวณ null ถ้ายังไม่ได้บันทึกข้อมูลร่างกาย */
  target: Result | null;
}

type Optimistic =
  | { type: "add"; entry: LoggedEntry }
  | { type: "servings"; entryId: string; servings: number }
  | { type: "remove"; entryId: string }
  | { type: "clear" };

function reduce(state: LoggedEntry[], action: Optimistic): LoggedEntry[] {
  switch (action.type) {
    case "add":
      return [...state, action.entry];

    case "remove":
      return state.filter((entry) => entry.entryId !== action.entryId);

    case "clear":
      return [];

    case "servings":
      return state.map((entry) => {
        if (entry.entryId !== action.entryId) return entry;

        const per = entry.servings || 1;
        const scale = action.servings / per;
        return {
          ...entry,
          servings: action.servings,
          kcal: Math.round(entry.kcal * scale),
          protein: round1(entry.protein * scale),
          carbs: round1(entry.carbs * scale),
          fat: round1(entry.fat * scale),
        };
      });
  }
}

export function FoodLog({ date, entries, target }: FoodLogProps) {
  const [items, apply] = useOptimistic(entries, reduce);
  const [, startAction] = useTransition();

  const [meal, setMeal] = useState<MealSlot>(guessMeal());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FoodCategory | "all">("all");

  const totals = useMemo(() => sumTotals(items), [items]);
  const matches = useMemo(
    () => searchFoods(query, category),
    [query, category],
  );

  const add = (food: Food) => {
    startAction(async () => {
      apply({
        type: "add",
        entry: {
          entryId: `temp-${crypto.randomUUID()}`,
          meal,
          foodId: food.id,
          name: food.name,
          serving: food.serving,
          servings: 1,
          kcal: food.kcal,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        },
      });
      await addFoodAction({ date, meal, foodId: food.id, servings: 1 });
    });
  };

  const changeServings = (entry: LoggedEntry, next: number) => {
    if (next < 0.5 || next > 20) return;
    startAction(async () => {
      apply({ type: "servings", entryId: entry.entryId, servings: next });
      await setServingsAction(entry.entryId, next);
    });
  };

  const remove = (entryId: string) => {
    startAction(async () => {
      apply({ type: "remove", entryId });
      await removeFoodAction(entryId);
    });
  };

  const clearAll = () => {
    startAction(async () => {
      apply({ type: "clear" });
      await clearDayAction(date);
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr] lg:items-start">
      <div className="space-y-4">
        <BudgetCard totals={totals} target={target} />

        <section className="rounded-3xl border border-brand-100 bg-white/80 p-5 shadow-soft backdrop-blur-xl">
          <h2 className="font-display text-sm text-ink">กำลังเพิ่มเข้า</h2>

          <div className="mt-3 grid grid-cols-4 gap-1 rounded-2xl border border-brand-100 bg-brand-50/70 p-1.5">
            {MEAL_SLOTS.map((slot) => {
              const active = slot.key === meal;
              return (
                <button
                  key={slot.key}
                  type="button"
                  onClick={() => setMeal(slot.key)}
                  aria-pressed={active}
                  className={cn(
                    "relative cursor-pointer rounded-xl px-1 py-2 text-center text-xs font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                    active ? "text-brand-700" : "text-ink-soft hover:text-brand-700",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="meal-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-brand-100"
                    />
                  )}
                  <span className="relative flex flex-col items-center gap-0.5">
                    <span aria-hidden className="text-sm leading-none">
                      {slot.emoji}
                    </span>
                    {slot.label.replace("มื้อ", "")}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <FoodPicker
          query={query}
          onQuery={setQuery}
          category={category}
          onCategory={setCategory}
          matches={matches}
          onAdd={add}
        />
      </div>

      <DayList
        items={items}
        totals={totals}
        onServings={changeServings}
        onRemove={remove}
        onClear={clearAll}
      />
    </div>
  );
}

/* ------------------------------------------------------- โควตาแคลอรี่วันนี้ */

function BudgetCard({
  totals,
  target,
}: {
  totals: ReturnType<typeof sumTotals>;
  target: Result | null;
}) {
  const size = 220;
  const stroke = 16;
  const radius = (size - stroke) / 2;

  const goal = target?.target ?? 0;
  const ratio = goal > 0 ? totals.kcal / goal : 0;
  const over = goal > 0 && totals.kcal > goal;
  const left = Math.max(goal - totals.kcal, 0);

  return (
    <section className="rounded-3xl border border-brand-100 bg-white/80 p-6 shadow-soft backdrop-blur-xl">
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
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={over ? "#e5484d" : "var(--color-brand-500)"}
              strokeWidth={stroke}
              strokeLinecap="round"
              initial={false}
              animate={{ pathLength: Math.min(Math.max(ratio, 0), 1) }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>

          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-[0.7rem] text-ink-soft">วันนี้กินไปแล้ว</p>
              <p
                className={cn(
                  "font-display text-[2.5rem] leading-none",
                  over ? "text-destructive" : "text-brand-600",
                )}
              >
                <CountUp value={totals.kcal} />
              </p>
              {goal > 0 ? (
                <p className="mt-1 text-xs text-ink-soft">
                  จาก {goal.toLocaleString("en-US")} kcal
                </p>
              ) : (
                <p className="mt-1 text-xs text-ink-soft">กิโลแคลอรี่</p>
              )}
            </div>
          </div>
        </div>

        {goal > 0 ? (
          <p
            className={cn(
              "mt-4 rounded-full px-4 py-1.5 text-xs font-medium",
              over
                ? "bg-destructive/10 text-destructive"
                : "bg-fresh/60 text-[#1f7a56]",
            )}
          >
            {over
              ? `เกินมา ${(totals.kcal - goal).toLocaleString("en-US")} kcal`
              : `เหลืออีก ${left.toLocaleString("en-US")} kcal`}
          </p>
        ) : (
          <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-center text-[0.7rem] leading-relaxed text-ink-soft">
            ไปกรอกข้อมูลที่แท็บ &ldquo;คำนวณเป้าหมาย&rdquo; แล้วกดบันทึก
            <br />
            จะได้เห็นว่าเหลือกินได้อีกกี่แคล
          </p>
        )}

        {target && (
          <div className="mt-5 w-full space-y-2.5">
            <MacroLine
              label="โปรตีน"
              icon={Egg}
              color="var(--macro-protein)"
              eaten={totals.protein}
              goal={target.macros.protein.grams}
            />
            <MacroLine
              label="คาร์บ"
              icon={Wheat}
              color="var(--macro-carbs)"
              eaten={totals.carbs}
              goal={target.macros.carbs.grams}
            />
            <MacroLine
              label="ไขมัน"
              icon={Droplets}
              color="var(--macro-fat)"
              eaten={totals.fat}
              goal={target.macros.fat.grams}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function MacroLine({
  label,
  icon: Icon,
  color,
  eaten,
  goal,
}: {
  label: string;
  icon: React.ElementType;
  color: string;
  eaten: number;
  goal: number;
}) {
  const percent = goal > 0 ? Math.min((eaten / goal) * 100, 100) : 0;
  const over = eaten > goal;

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="flex items-center gap-1.5 text-ink">
          <Icon className="size-3.5" style={{ color }} />
          {label}
        </span>
        <span className={cn("tabular-nums", over ? "text-destructive" : "text-ink-soft")}>
          {eaten} / {goal} ก.
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-50">
        <motion.div
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
          style={{ backgroundColor: over ? "#e5484d" : color }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- เลือกเมนู */

function FoodPicker({
  query,
  onQuery,
  category,
  onCategory,
  matches,
  onAdd,
}: {
  query: string;
  onQuery: (value: string) => void;
  category: FoodCategory | "all";
  onCategory: (value: FoodCategory | "all") => void;
  matches: Food[];
  onAdd: (food: Food) => void;
}) {
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const handleAdd = (food: Food) => {
    onAdd(food);
    setJustAdded(food.id);
    window.setTimeout(() => setJustAdded((id) => (id === food.id ? null : id)), 900);
  };

  return (
    <section className="rounded-3xl border border-brand-100 bg-white/80 p-5 shadow-soft backdrop-blur-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-brand-300" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="ค้นหาเมนู เช่น ข้าวมันไก่"
          className="h-12 w-full rounded-2xl border border-brand-100 bg-brand-50/50 pr-10 pl-11 text-sm text-ink transition-all duration-200 outline-none placeholder:text-brand-300/90 hover:border-brand-200 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-200/40"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQuery("")}
            aria-label="ล้างคำค้น"
            className="absolute top-1/2 right-3 grid size-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-brand-300 transition-colors hover:bg-brand-50 hover:text-brand-500"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1.5">
        <CategoryChip
          label="ทั้งหมด"
          active={category === "all"}
          onClick={() => onCategory("all")}
        />
        {FOOD_CATEGORIES.map((item) => (
          <CategoryChip
            key={item.key}
            label={item.label}
            active={category === item.key}
            onClick={() => onCategory(item.key)}
          />
        ))}
      </div>

      <div className="mt-2 max-h-80 space-y-1 overflow-y-auto pr-1">
        {matches.length === 0 && (
          <p className="py-8 text-center text-xs text-ink-soft">
            ไม่เจอเมนูที่ค้นหา ลองคำอื่นนะ
          </p>
        )}

        {matches.map((food) => (
          <div
            key={food.id}
            className="flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-brand-50/70"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{food.name}</p>
              <p className="truncate text-[0.7rem] text-ink-soft">
                {food.serving} · {food.kcal} kcal
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleAdd(food)}
              aria-label={`เพิ่ม ${food.name}`}
              className={cn(
                "grid size-8 shrink-0 cursor-pointer place-items-center rounded-full transition-all duration-200 active:scale-90",
                justAdded === food.id
                  ? "bg-fresh text-[#1f7a56]"
                  : "bg-brand-100 text-brand-700 hover:bg-brand-200",
              )}
            >
              {justAdded === food.id ? (
                <Check className="size-4" />
              ) : (
                <Plus className="size-4" />
              )}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
        active
          ? "bg-brand-200 text-brand-800"
          : "bg-brand-50 text-ink-soft hover:bg-brand-100 hover:text-brand-700",
      )}
    >
      {label}
    </button>
  );
}

/* ----------------------------------------------------------- รายการวันนี้ */

function DayList({
  items,
  totals,
  onServings,
  onRemove,
  onClear,
}: {
  items: LoggedEntry[];
  totals: ReturnType<typeof sumTotals>;
  onServings: (entry: LoggedEntry, next: number) => void;
  onRemove: (entryId: string) => void;
  onClear: () => void;
}) {
  return (
    <section className="rounded-3xl border border-brand-100 bg-white/80 p-5 shadow-soft backdrop-blur-xl lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-sm text-ink">
          <UtensilsCrossed className="size-4 text-brand-400" />
          มื้อวันนี้
          {totals.count > 0 && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[0.7rem] text-ink-soft">
              {totals.count} รายการ
            </span>
          )}
        </h2>

        {totals.count > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-[0.7rem] text-ink-soft transition-colors hover:bg-destructive/8 hover:text-destructive"
          >
            ล้างทั้งวัน
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="grid min-h-56 place-items-center text-center">
          <div>
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto grid size-16 place-items-center rounded-full bg-brand-50"
            >
              <UtensilsCrossed className="size-7 text-brand-300" />
            </motion.div>
            <p className="mt-4 text-sm text-ink">ยังไม่ได้บันทึกอะไรเลย</p>
            <p className="mt-1 text-xs text-ink-soft">
              เลือกมื้อแล้วกด + ที่เมนูทางซ้าย
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {MEAL_SLOTS.map((slot) => {
            const group = items.filter((entry) => entry.meal === slot.key);
            if (group.length === 0) return null;

            const slotKcal = group.reduce((sum, entry) => sum + entry.kcal, 0);

            return (
              <div key={slot.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-brand-700">
                    <span aria-hidden>{slot.emoji}</span>
                    {slot.label}
                  </p>
                  <p className="font-display text-xs text-ink-soft tabular-nums">
                    {slotKcal.toLocaleString("en-US")} kcal
                  </p>
                </div>

                <div className="mt-1.5 space-y-1.5">
                  <AnimatePresence initial={false}>
                    {group.map((entry) => (
                      <motion.div
                        key={entry.entryId}
                        layout
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-2 rounded-2xl bg-brand-50/60 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-ink">
                              {entry.name}
                            </p>
                            <p className="truncate text-[0.7rem] text-ink-soft">
                              {entry.serving} · {entry.kcal} kcal
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-white p-0.5 ring-1 ring-brand-100">
                            <Stepper
                              label="ลดจำนวน"
                              onClick={() =>
                                onServings(entry, entry.servings - 0.5)
                              }
                              disabled={entry.servings <= 0.5}
                            >
                              <Minus className="size-3" />
                            </Stepper>

                            <span className="min-w-8 text-center font-display text-xs text-ink tabular-nums">
                              {entry.servings}
                            </span>

                            <Stepper
                              label="เพิ่มจำนวน"
                              onClick={() =>
                                onServings(entry, entry.servings + 0.5)
                              }
                              disabled={entry.servings >= 20}
                            >
                              <Plus className="size-3" />
                            </Stepper>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemove(entry.entryId)}
                            aria-label={`ลบ ${entry.name}`}
                            className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-brand-300 transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between border-t border-brand-100 pt-3">
            <p className="flex items-center gap-1.5 text-sm text-ink">
              <Flame className="size-4 text-brand-400" />
              รวมทั้งวัน
            </p>
            <p className="font-display text-lg text-brand-700 tabular-nums">
              <CountUp value={totals.kcal} /> kcal
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function Stepper({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid size-6 cursor-pointer place-items-center rounded-full text-brand-700 transition-colors hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- helpers */

/** เดามื้อจากเวลาปัจจุบัน ให้กดน้อยลงหนึ่งครั้ง */
function guessMeal(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}
