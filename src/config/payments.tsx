import { FlaskConical } from 'lucide-react';

// Vizito has no live payment gateway yet: "online" payments and refunds are recorded but no real
// money moves. Every payment/refund message goes through these helpers so the wording is honest
// now and switches in one place when a real gateway is connected (VITE_REAL_PAYMENTS=true).
export const PAYMENTS_SIMULATED = import.meta.env.VITE_REAL_PAYMENTS !== 'true';

export const paidLabel = (mode?: string | null) => `${PAYMENTS_SIMULATED ? 'Payment recorded — test mode' : 'Paid'}${mode ? ` · ${mode}` : ''}`;

/** What happens to the money on a refund (amount already formatted, e.g. "₹750"). */
export const refundText = (amount: string) => (PAYMENTS_SIMULATED
  ? `A test refund of ${amount} is recorded — no real bank transfer is made in test mode.`
  : `${amount} is being refunded to your original payment method (usually 5–7 working days).`);
export const refundWillText = (amount: string) => (PAYMENTS_SIMULATED
  ? `Your test payment of ${amount} will be marked refunded — no real money moves in test mode.`
  : `Your ${amount} will be refunded to your original payment method.`);

/** Shown wherever a patient chooses or sees an online payment. */
export function TestPaymentNote({ className = '' }: { className?: string }) {
  if (!PAYMENTS_SIMULATED) return null;
  return (
    <p role="note" className={`text-[11px] font-semibold text-indigo-900 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5 ${className}`}>
      <FlaskConical className="w-3.5 h-3.5 mt-px shrink-0" />
      Test mode: no real money is charged and no bank account is debited.
    </p>
  );
}
