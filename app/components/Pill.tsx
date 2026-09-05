type PillTone = "ok" | "warn" | "err" | "info" | "neutral";

export default function Pill({
  tone = "neutral",
  children,
}: {
  tone?: PillTone;
  children: React.ReactNode;
}) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}
