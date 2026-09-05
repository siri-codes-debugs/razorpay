import { NextResponse } from 'next/server';
import { generateTransactions } from '@/lib/dataGenerator';
import { reconcileTransactions } from '@/lib/reconcile';

export async function GET() {
  const SEED = Number(process.env.RECONCILE_SEED ?? 12345);
  const COUNT = Number(process.env.RECONCILE_COUNT ?? 100);
  const txs = generateTransactions(SEED, COUNT);
  const summary = reconcileTransactions(txs);

  return NextResponse.json({ seed: SEED, count: COUNT, transactions: txs, summary });
}
