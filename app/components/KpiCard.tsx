"use client";
import { motion } from "framer-motion";
import Pill from "./Pill";
import CountUp from "./CountUp";

export default function KpiCard({
  label,
  value,
  tone,
  hint,
  children,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "err";
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="card p-6 rounded-[var(--radius-lg)] flex items-center justify-between gap-4"
    >
      <div>
        <Pill tone={tone}>{label}</Pill>
        <div className="kpi-value text-3xl mt-3">
          <CountUp value={value} />
        </div>
        {hint && <div className="muted mt-2 text-sm">{hint}</div>}
      </div>
      {children}
    </motion.div>
  );
}
