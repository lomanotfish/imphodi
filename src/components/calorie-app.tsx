"use client";

import { AnimatePresence } from "motion/react";

import { AuthCard } from "@/components/auth-card";
import { Dashboard } from "@/components/dashboard";
import type { Profile } from "@/lib/calories";
import type { ThemeName } from "@/lib/theme";
import type { LoggedEntry } from "@/lib/totals";

export interface SessionUser {
  name: string;
  profile: Profile | null;
}

interface CalorieAppProps {
  user: SessionUser | null;
  theme: ThemeName;
  logDate: string;
  entries: LoggedEntry[];
}

/** สลับระหว่างหน้าเข้าสู่ระบบกับหน้าคำนวณ โดยไม่เปลี่ยน URL */
export function CalorieApp({
  user,
  theme,
  logDate,
  entries,
}: CalorieAppProps) {
  return (
    <main className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
      <AnimatePresence mode="wait">
        {user ? (
          <Dashboard
            key="dashboard"
            name={user.name}
            savedProfile={user.profile}
            theme={theme}
            logDate={logDate}
            entries={entries}
          />
        ) : (
          <AuthCard key="auth" theme={theme} />
        )}
      </AnimatePresence>
    </main>
  );
}
