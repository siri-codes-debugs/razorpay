export type PaymentStatus = 'paid' | 'failed' | 'pending';

export type Transaction = {
  transaction_id: string;
  customer_id: string;
  payment_amount: number; // in paise (integer)
  payment_status: PaymentStatus;
  payment_date: string; // ISO
  settlement_amount: number; // in paise (integer)
  settlement_date: string; // ISO
  fee: number; // in paise
  refund: number; // in paise
  tax: number; // in paise
  chargeback: number; // in paise
};

export type ExceptionRecord = {
  transaction_id: string;
  expected_amount: number;
  actual_amount: number;
  difference: number;
  detected_reason: string;
};

export type ReconcileSummary = {
  total_records: number;
  matched_records: number;
  exception_records: number;
  match_rate: number; // 0-1
  exceptions: ExceptionRecord[];
};
