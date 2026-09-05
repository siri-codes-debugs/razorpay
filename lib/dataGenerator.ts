import { mulberry32, randint } from './rng';
import { Transaction } from './types';

export function generateTransactions(seed = 12345, count = 100): Transaction[] {
  const rng = mulberry32(seed);
  const txs: Transaction[] = [];
  const startTime = new Date('2026-01-01T00:00:00.000Z').getTime();

  for (let i = 0; i < count; i++) {
    const transaction_id = `tx_${seed}_${i}`;
    const customer_id = `cust_${(Math.floor(rng() * 1000) + 1).toString().padStart(4, '0')}`;

    // amounts in paise (integers) to avoid floating errors
    const payment_amount = randint(rng, 5000, 200000); // ₹50 to ₹2000

    // fees: 50 to 500 paise or percentage of amount
    const fee = Math.round(payment_amount * (0.005 + rng() * 0.02));

    // tax: 0 to 18% (in paise)
    const tax = Math.round(payment_amount * (rng() < 0.3 ? 0 : rng() * 0.18));

    // refund: mostly zero, sometimes partial
    const refund = rng() < 0.12 ? randint(rng, 500, Math.min(50000, Math.floor(payment_amount / 2))) : 0;

    // chargeback: rare
    const chargeback = rng() < 0.05 ? randint(rng, 500, Math.min(100000, payment_amount)) : 0;

    const payment_date = new Date(startTime + i * 1000 * 60 * 60 * 6).toISOString();
    const settlement_date = new Date(startTime + i * 1000 * 60 * 60 * 24).toISOString();

    // expected settlement
    const expected_settlement = payment_amount - fee - refund - tax - chargeback;

    // intentionally create exceptions in ~15% of records
    let settlement_amount = expected_settlement;
    if (rng() < 0.15) {
      // either under-settled or over-settled by a small random amount (1 to 5000 paise)
      const delta = randint(rng, -5000, 5000);
      // avoid accidentally making it exactly equal
      if (delta === 0) settlement_amount = expected_settlement + 1;
      else settlement_amount = Math.max(0, expected_settlement + delta);
    }

    // Occasionally create settlements that miss chargeback or refund application
    if (rng() < 0.06 && chargeback > 0) {
      // forget to subtract chargeback
      settlement_amount = settlement_amount + chargeback;
    }

    // Occasionally corrupt fee application
    if (rng() < 0.05) {
      settlement_amount = settlement_amount + randint(rng, -200, 200);
    }

    const tx: Transaction = {
      transaction_id,
      customer_id,
      payment_amount,
      payment_status: rng() < 0.98 ? 'paid' : 'failed',
      payment_date,
      settlement_amount,
      settlement_date,
      fee,
      refund,
      tax,
      chargeback,
    };

    txs.push(tx);
  }

  return txs;
}
