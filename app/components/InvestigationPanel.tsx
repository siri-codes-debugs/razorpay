"use client";
import { motion, type Variants } from "framer-motion";
import Pill from "./Pill";

const fieldVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function InvestigationPanel({ analysis }: { analysis: any }) {
  if (!analysis) {
    return <div className="muted">Select an exception to see agent analysis.</div>;
  }

  if (analysis.loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-4 rounded-full bg-white/5 overflow-hidden relative"
            style={{ width: `${80 - i * 15}%` }}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
              }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            />
          </motion.div>
        ))}
      </div>
    );
  }

  const fields = [
    { label: "Explanation", value: analysis.explanation ?? analysis.diagnosis },
    {
      label: "Confidence",
      value: analysis.confidence != null ? (analysis.confidence * 100).toFixed(1) + "%" : "—",
    },
    { label: "Recommended action", value: analysis.recommended_action },
  ];

  return (
    <div>
      {fields.map((f, i) => (
        <motion.div
          key={f.label}
          custom={i}
          variants={fieldVariants}
          initial="hidden"
          animate="show"
          className="mb-4"
        >
          <Pill tone="ok">{f.label}</Pill>
          <div className="font-medium mt-2">{f.value ?? "—"}</div>
        </motion.div>
      ))}

      <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="show" className="mb-3">
        <Pill tone="ok">Evidence</Pill>
        <ul className="list-disc ml-5 mt-2 space-y-1">
          {analysis.evidence?.map((e: string, i: number) => (
            <li key={i} className="text-sm">
              {e}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div custom={4} variants={fieldVariants} initial="hidden" animate="show">
        <Pill tone="ok">Audit trail</Pill>
        <ol className="list-decimal ml-5 mt-2 space-y-1">
          {analysis.audit_trail?.map((a: string, i: number) => (
            <li key={i} className="text-sm">
              {a}
            </li>
          ))}
        </ol>
      </motion.div>

      {analysis.error && (
        <div className="mt-3 p-3 bg-white/5 rounded-lg text-sm text-rose-300">
          Error: {String(analysis.error)}
        </div>
      )}
    </div>
  );
}
