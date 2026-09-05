"use client";
import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import KpiCard from "./components/KpiCard";
import Pill from "./components/Pill";
import ProgressRing from "./components/ProgressRing";
import Reveal from "./components/Reveal";
import InvestigationPanel from "./components/InvestigationPanel";

type Transaction = any;
type ReconcileSummary = any;

function reasonTone(reason: string, diff: number) {
  if (reason === "payment_not_paid") return "err" as const;
  if (diff === 0) return "ok" as const;
  return Math.abs(diff) > 10000 ? ("err" as const) : ("warn" as const);
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<ReconcileSummary | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [openTx, setOpenTx] = useState<string | null>(null);
  const [pageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [scrolled, setScrolled] = useState(false);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 220], [1, 0.4]);
  const heroY = useTransform(scrollY, [0, 220], [0, -24]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/reconcile");
      const data = await res.json();
      setTransactions(data.transactions ?? []);
      setSummary(data.summary ?? null);
      setLoading(false);
    }
    load();
  }, []);

  async function investigate(txId: string) {
    setSelectedAnalysis({ loading: true });
    setOpenTx(txId);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: txId }),
      });
      const data = await res.json();
      setSelectedAnalysis(data.analysis ?? { error: data.error });
    } catch (err: any) {
      setSelectedAnalysis({ error: String(err) });
    }
  }

  const matchPercent = summary ? summary.match_rate * 100 : 0;

  const reasons = useMemo(
    () => Array.from<string>(new Set((summary?.exceptions ?? []).map((ex: any) => ex.detected_reason))),
    [summary]
  );

  const filteredExceptions = useMemo(() => {
    return (summary?.exceptions ?? []).filter((ex: any) => {
      if (reasonFilter !== "all" && ex.detected_reason !== reasonFilter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        ex.transaction_id.toLowerCase().includes(q) ||
        (ex.customer_id ?? "").toLowerCase().includes(q)
      );
    });
  }, [summary, reasonFilter, query]);

  const pageRows = filteredExceptions.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen pb-16">
      <motion.div
        className="sticky top-0 z-30 border-b transition-colors"
        style={{
          borderColor: scrolled ? "var(--border)" : "transparent",
          background: scrolled ? "rgba(5,7,13,0.72)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-8">
          <motion.header
            style={{ opacity: heroOpacity, y: heroY }}
            className="flex items-center justify-between py-6"
          >
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="text-2xl font-bold text-white tracking-tight"
              >
                AI Finance Controller
              </motion.h1>
              <p className="muted text-sm mt-1">
                AI-powered payment reconciliation and exception management
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="muted text-sm">Seed</span>
              <Pill tone="ok">12345</Pill>
            </div>
          </motion.header>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-8 pt-4">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {[0, 1, 2].map((i) => (
                <div key={i} className="card p-6 rounded-[var(--radius-lg)] h-32 relative overflow-hidden">
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
                    }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ repeat: Infinity, duration: 1.3, ease: "linear", delay: i * 0.15 }}
                  />
                </div>
              ))}
            </motion.div>
          )}

          {!loading && summary && (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Reveal delay={0}>
                  <KpiCard label="Total records" value={summary.total_records} tone="ok" hint="All processed records" />
                </Reveal>
                <Reveal delay={0.08}>
                  <KpiCard
                    label="Matched"
                    value={summary.matched_records}
                    tone="ok"
                    hint="Records that matched expected settlement"
                  />
                </Reveal>
                <Reveal delay={0.16}>
                  <KpiCard label="Exceptions" value={summary.exception_records} tone="err" hint="Unresolved mismatches requiring review">
                    <div>
                      <div className="w-28 h-28 flex items-center justify-center">
                        <ProgressRing percent={matchPercent} />
                      </div>
                      <div className="text-center muted mt-2 text-xs">Match Rate</div>
                    </div>
                  </KpiCard>
                </Reveal>
              </section>

              <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Reveal delay={0.1} className="lg:col-span-2">
                  <div className="card p-4 rounded-[var(--radius-lg)]">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                      <div>
                        <h2 className="text-lg font-bold">Exceptions</h2>
                        <div className="mt-2">
                          <Pill tone="err">Issues requiring review</Pill>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          className="focus-ring bg-white/[0.03] border border-white/10 px-3 py-2 rounded-[var(--radius-sm)] text-sm text-white placeholder:text-white/40 transition-colors focus:border-cyan-400/40"
                          placeholder="Search tx id or customer"
                          value={query}
                          onChange={(e) => {
                            setQuery(e.target.value);
                            setPage(1);
                          }}
                        />
                        <select
                          className="focus-ring bg-[#0b1220] border border-white/10 px-3 py-2 rounded-[var(--radius-sm)] text-sm text-white transition-colors"
                          value={reasonFilter}
                          onChange={(e) => {
                            setReasonFilter(e.target.value);
                            setPage(1);
                          }}
                        >
                          <option value="all">All reasons</option>
                          {reasons.map((r: string) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs uppercase whitespace-nowrap">
                            {["Transaction", "Expected", "Actual", "Diff", "Reason", "Action"].map((h) => (
                              <th key={h} className="py-3 px-2 text-left">
                                <span className="pill pill--info">{h}</span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <AnimatePresence>
                            {pageRows.map((ex: any, i: number) => {
                              const diff = ex.difference;
                              const tone = reasonTone(ex.detected_reason, diff);
                              return (
                                <motion.tr
                                  key={ex.transaction_id}
                                  layout
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.03 }}
                                  className="border-t border-white/5 hover:bg-white/[0.025] transition-colors"
                                >
                                  <td className="py-3 px-2 font-mono">{ex.transaction_id}</td>
                                  <td className="py-3 px-2">₹{(ex.expected_amount / 100).toFixed(2)}</td>
                                  <td className="py-3 px-2">₹{(ex.actual_amount / 100).toFixed(2)}</td>
                                  <td className="py-3 px-2">₹{(ex.difference / 100).toFixed(2)}</td>
                                  <td className="py-3 px-2">
                                    <Pill tone={tone}>{ex.detected_reason}</Pill>
                                  </td>
                                  <td className="py-3 px-2">
                                    <motion.button
                                      whileHover={{ scale: 1.04 }}
                                      whileTap={{ scale: 0.97 }}
                                      className="glow-btn px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 text-black font-semibold text-sm"
                                      onClick={() => investigate(ex.transaction_id)}
                                    >
                                      Investigate
                                    </motion.button>
                                  </td>
                                </motion.tr>
                              );
                            })}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
                      <Pill tone="err">Showing {filteredExceptions.length} exceptions</Pill>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={page === 1}
                          onClick={() => setPage(Math.max(1, page - 1))}
                          className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-colors"
                        >
                          Prev
                        </button>
                        <div className="px-2 muted text-sm">Page {page}</div>
                        <button
                          onClick={() => setPage(page + 1)}
                          className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </Reveal>

                <Reveal delay={0.2}>
                  <aside className="card p-4 rounded-[var(--radius-lg)]">
                    <h2 className="text-lg font-bold mb-3">Investigation</h2>
                    <InvestigationPanel analysis={selectedAnalysis} />
                  </aside>
                </Reveal>
              </main>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {openTx && (
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setOpenTx(null);
                setSelectedAnalysis(null);
              }}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="absolute right-0 top-0 h-full w-full max-w-md p-6 bg-panel card shadow-2xl overflow-y-auto"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">Investigation — {openTx}</h3>
                  <div className="muted text-sm mt-1">Detailed AI analysis and audit trail</div>
                </div>
                <button
                  className="text-white/60 hover:text-white transition-colors"
                  onClick={() => {
                    setOpenTx(null);
                    setSelectedAnalysis(null);
                  }}
                >
                  Close
                </button>
              </div>

              <div className="mt-5">
                <InvestigationPanel analysis={selectedAnalysis} />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
