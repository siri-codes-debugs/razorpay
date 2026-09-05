import { ExceptionRecord, Transaction } from './types';

export type AgentAnalysis = {
  transaction_id: string;
  explanation: string;
  confidence: number; // 0-1
  evidence: string[];
  recommended_action: string;
  audit_trail: string[];
};

// Deterministic rule-based investigator (designed to be replaceable by an LLM later)
export function investigateException(tx: Transaction, ex: ExceptionRecord): AgentAnalysis {
  const audit: string[] = [];
  audit.push('Loaded transaction and exception');

  const evidence: string[] = [];
  evidence.push(`payment_amount=${tx.payment_amount}`);
  evidence.push(`fee=${tx.fee}`);
  evidence.push(`refund=${tx.refund}`);
  evidence.push(`tax=${tx.tax}`);
  evidence.push(`chargeback=${tx.chargeback}`);
  evidence.push(`expected=${ex.expected_amount}`);
  evidence.push(`actual=${ex.actual_amount}`);

  let explanation = 'Settlement does not match expected calculation.';
  let recommended_action = 'Investigate payment and settlement ledger entries for this transaction.';
  let confidence = 0.5;

  // Heuristics used also in reconcile; deterministic and transparent
  const expected = ex.expected_amount;
  const actual = ex.actual_amount;
  const diff = ex.difference;

  if (ex.detected_reason === 'payment_not_paid') {
    explanation = 'Payment is not marked as paid; no settlement expected.';
    recommended_action = 'Verify payment status and retry settlement if appropriate.';
    confidence = 0.95;
    audit.push('Detected payment_not_paid');
  } else if (ex.detected_reason === 'refund_missing_in_settlement') {
    explanation = 'Settlement appears to be missing a refund amount.';
    recommended_action = 'Check refund ledger and request missing refund reconciliation.';
    confidence = 0.85;
    audit.push('Detected refund_missing_in_settlement');
  } else if (ex.detected_reason === 'chargeback_missing_in_settlement') {
    explanation = 'Settlement appears to be missing a chargeback amount.';
    recommended_action = 'Review chargeback processing and adjust settlement ledger.';
    confidence = 0.85;
    audit.push('Detected chargeback_missing_in_settlement');
  } else if (ex.detected_reason === 'rounding_difference') {
    explanation = 'Small rounding difference detected; likely due to rounding rules.';
    recommended_action = 'If within tolerance, mark as settled; else adjust ledger.';
    confidence = 0.7;
    audit.push('Detected rounding_difference');
  } else {
    // generic heuristics
    audit.push('Applying generic heuristics');
    if (Math.abs(diff) > tx.payment_amount * 0.05) {
      explanation = 'Significant difference (>5% of payment amount). Possible incorrect fee/refund/chargeback application.';
      recommended_action = 'Open a high-priority investigation: compare settlement and payment ledgers.';
      confidence = 0.9;
      audit.push('Large difference heuristic');
    } else if (Math.abs(diff) <= 100) {
      explanation = 'Small difference — likely a minor accounting or rounding discrepancy.';
      recommended_action = 'Review rounding/tax rules; consider auto-accept if policy allows.';
      confidence = 0.6;
      audit.push('Small difference heuristic');
    } else {
      explanation = 'Mismatch could be due to fee/tax/refund/chargeback misapplication.';
      recommended_action = 'Compare detailed ledger entries and bank settlement CSVs.';
      confidence = 0.65;
      audit.push('Fallback heuristic');
    }
  }

  return {
    transaction_id: tx.transaction_id,
    explanation,
    confidence,
    evidence,
    recommended_action,
    audit_trail: audit,
  };
}
