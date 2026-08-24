"use client";

import { useEffect } from "react";
import { useSpring, useTransform, motion } from "motion/react";

interface CountUpProps {
  value: number;
  decimals?: number;
  /** คั่นหลักพันด้วยลูกน้ำ */
  grouped?: boolean;
}

/**
 * ตัวเลขที่ไล่ขึ้นแบบสปริง
 * ส่ง MotionValue เป็น children ตรง ๆ จึงไม่ทำให้ React re-render ทุกเฟรม
 */
export function CountUp({ value, decimals = 0, grouped = true }: CountUpProps) {
  const spring = useSpring(0, { stiffness: 55, damping: 16, mass: 0.8 });

  const text = useTransform(spring, (current) =>
    current.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: grouped,
    }),
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{text}</motion.span>;
}
