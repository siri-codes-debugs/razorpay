import { Transaction, ExceptionRecord, ReconcileSummary } from './types';

function toPaise(n: number) {
  // amounts already in paise throughout this system; passthrough for clarity
  return Math.round(n);
}

export function reconcileTransactions(txs: Transaction[]): ReconcileSummary {
  const exceptions: ExceptionRecord[] = [];
  let matched = 0;

  for (const tx of txs) {
    const expected =
      toPaise(tx.payment_amount) -
      toPaise(tx.fee) -
      toPaise(tx.refund) -
      toPaise(tx.tax) -
      toPaise(tx.chargeback);

    const actual = toPaise(tx.settlement_amount);
    const difference = expected - actual; // expected - actual

    if (tx.payment_status !== 'paid') {
      exceptions.push({
        transaction_id: tx.transaction_id,
        expected_amount: expected,
        actual_amount: actual,
        difference,
        detected_reason: 'payment_not_paid',
      });
      continue;
    }

    if (difference === 0) {
      matched += 1;
      continue;
    }

    // Detection heuristics
    let reason = 'settlement_mismatch';

    // refund not applied: actual equals payment - fee - tax
    if (actual === tx.payment_amount - tx.fee - tx.tax) {
      reason = 'refund_missing_in_settlement';
    }

    // chargeback not applied: actual equals payment - fee - refund - tax
    if (actual === tx.payment_amount - tx.fee - tx.refund - tx.tax) {
      reason = 'chargeback_missing_in_settlement';
    }

    // small rounding differences
    if (Math.abs(difference) <= 5) {
      reason = 'rounding_difference';
    }

    exceptions.push({
      transaction_id: tx.transaction_id,
      expected_amount: expected,
      actual_amount: actual,
      difference,
      detected_reason: reason,
    });
  }

  const total = txs.length;
  const exception_records = exceptions.length;
  const matched_records = matched;
  const match_rate = total > 0 ? matched_records / total : 0;

  const summary: ReconcileSummary = {
    total_records: total,
    matched_records,
    exception_records,
    match_rate,
    exceptions,
  };

  return summary;
}
