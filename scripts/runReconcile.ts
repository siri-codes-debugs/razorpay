import fs from 'fs';
import path from 'path';
import { generateTransactions } from '../lib/dataGenerator';
import { reconcileTransactions } from '../lib/reconcile';

const SEED = Number(process.env.RECONCILE_SEED ?? 12345);
const COUNT = Number(process.env.RECONCILE_COUNT ?? 100);

function paiseToString(p: number) {
  return `₹${(p / 100).toFixed(2)}`;
}

async function main() {
  const txs = generateTransactions(SEED, COUNT);
  const summary = reconcileTransactions(txs);

  console.log('Reconciliation Summary');
  console.log('----------------------');
  console.log(`Total records: ${summary.total_records}`);
  console.log(`Matched records: ${summary.matched_records}`);
  console.log(`Exception records: ${summary.exception_records}`);
  console.log(`Match rate: ${(summary.match_rate * 100).toFixed(2)}%`);

  if (summary.exceptions.length > 0) {
    console.log('\nExceptions (first 20):');
    for (const ex of summary.exceptions.slice(0, 20)) {
      console.log(
        `${ex.transaction_id}: expected=${paiseToString(ex.expected_amount)} actual=${paiseToString(
          ex.actual_amount
        )} diff=${paiseToString(ex.difference)} reason=${ex.detected_reason}`
      );
    }
  }

  // write full output to build/output/reconciliation.json
  const outDir = path.resolve(process.cwd(), 'build', 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'reconciliation.json');
  fs.writeFileSync(outPath, JSON.stringify({ seed: SEED, count: COUNT, summary }, null, 2));
  console.log('\nWrote full summary to', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
