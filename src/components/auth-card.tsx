"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
  LoaderCircle,
  Lock,
  Sparkles,
  User,
} from "lucide-react";

import { signInAction, signUpAction, type AuthState } from "@/app/actions";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { ThemeName } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

const COPY: Record<Mode, { title: string; sub: string; cta: string }> = {
  signin: {
    title: "ยินดีต้อนรับกลับ",
    sub: "ใส่ชื่อกับรหัสเดิมเพื่อดูข้อมูลที่บันทึกไว้",
    cta: "เข้าสู่ระบบ",
  },
  signup: {
    title: "สร้างบัญชีใหม่",
    sub: "ขอแค่ชื่อกับรหัส ไม่ต้องใช้อีเมลเลย",
    cta: "สมัครสมาชิก",
  },
};

export function AuthCard({ theme }: { theme: ThemeName }) {
  const [mode, setMode] = useState<Mode>("signin");

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className="mx-auto w-full max-w-104"
    >
      <div className="mb-4 flex justify-center">
        <ThemeSwitcher current={theme} />
      </div>

      <div className="rounded-[28px] border border-brand-100 bg-white/80 p-7 shadow-card backdrop-blur-xl sm:p-8">
        <Header mode={mode} />

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl border border-brand-100 bg-brand-50/70 p-1.5">
          {(["signin", "signup"] as Mode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={cn(
                "relative cursor-pointer rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                mode === item ? "text-brand-700" : "text-ink-soft hover:text-brand-700",
              )}
            >
              {mode === item && (
                <motion.span
                  layoutId="auth-tab"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-brand-100"
                />
              )}
              <span className="relative">{COPY[item].cta}</span>
            </button>
          ))}
        </div>

        {/* key ทำให้ state ของฟอร์มรีเซ็ตเมื่อสลับโหมด */}
        <AuthForm key={mode} mode={mode} />
      </div>

      <p className="mt-5 text-center text-xs leading-relaxed text-ink-soft">
        รหัสถูกเข้ารหัสด้วย scrypt ก่อนบันทึก
        <br />
        เราไม่เก็บรหัสจริงของคุณไว้ที่ไหนเลย
      </p>
    </motion.div>
  );
}

function Header({ mode }: { mode: Mode }) {
  return (
    <div className="text-center">
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        className="mx-auto grid size-16 place-items-center rounded-3xl bg-linear-to-br from-mark-from to-mark-to shadow-cta"
      >
        <Heart className="size-8 fill-mark-ink text-mark-ink" />
      </motion.div>

      <h1 className="mt-4 font-display text-2xl text-brand-700">อิ่มพอดี</h1>
      <p className="text-xs tracking-wide text-brand-400">calorie buddy</p>

      <div className="mt-4 h-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <p className="font-display text-base text-ink">{COPY[mode].title}</p>
            <p className="mt-0.5 text-xs text-ink-soft">{COPY[mode].sub}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function AuthForm({ mode }: { mode: Mode }) {
  const action = mode === "signin" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    {},
  );
  const [visible, setVisible] = useState(false);

  return (
    <form action={formAction} className="mt-5 space-y-3">
      <Field
        icon={User}
        name="name"
        type="text"
        placeholder="ชื่อของคุณ"
        autoComplete="username"
        maxLength={24}
        required
      />

      <div className="relative">
        <Field
          icon={Lock}
          name="password"
          type={visible ? "text" : "password"}
          placeholder="รหัสผ่าน"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          maxLength={72}
          required
          className="pr-12"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "ซ่อนรหัส" : "แสดงรหัส"}
          className="absolute top-0 right-0 grid h-12 w-12 cursor-pointer place-items-center rounded-r-2xl text-brand-300 transition-colors hover:text-brand-500"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      <AnimatePresence>
        {state.error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl bg-destructive/8 px-3 py-2 text-center text-xs text-destructive"
          >
            {state.error}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={pending}
        whileHover={{ scale: pending ? 1 : 1.015 }}
        whileTap={{ scale: pending ? 1 : 0.985 }}
        className="group relative mt-1 flex h-12 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl bg-linear-to-r from-cta-from to-cta-to font-display text-sm text-cta-ink shadow-cta transition-shadow hover:shadow-cta-lg disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <>
            {mode === "signin" ? (
              <ArrowRight className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
          </>
        )}
        <span className="relative">{COPY[mode].cta}</span>
      </motion.button>
    </form>
  );
}

function Field({
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<"input"> & { icon: React.ElementType }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-brand-300" />
      <input
        {...props}
        className={cn(
          "h-12 w-full rounded-2xl border border-brand-100 bg-brand-50/50 pl-11 text-sm text-ink transition-all duration-200 outline-none",
          "placeholder:text-brand-300/90",
          "hover:border-brand-200 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-200/40",
          className,
        )}
      />
    </div>
  );
}
