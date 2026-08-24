/**
 * ฉากหลัง — ก้อนสีพาสเทลเบลอ ๆ ลอยช้า ๆ
 * ใช้ CSS keyframes ล้วน ไม่ re-render และไม่กิน CPU เท่า JS animation
 */
export function PrettyBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-linear-to-b from-brand-50 via-background to-cream" />

      <div className="absolute -top-32 -left-24 size-[28rem] animate-drift-a rounded-full bg-brand-200/55 blur-3xl" />
      <div className="absolute top-1/4 -right-32 size-[32rem] animate-drift-b rounded-full bg-warm/50 blur-3xl" />
      <div className="absolute -bottom-40 left-1/4 size-[30rem] animate-drift-c rounded-full bg-cool/45 blur-3xl" />

      {/* ลายจุดบาง ๆ ให้พื้นไม่เรียบจนแบน */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--color-brand-700) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
    </div>
  );
}
