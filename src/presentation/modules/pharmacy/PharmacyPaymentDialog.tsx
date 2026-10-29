import { useEffect, useState } from 'react';
import VizitoDialog from '../../components/dialogs/VizitoDialog';
import { payOrderApi, type PatientOrderV2 } from '../../../services/pharmacyOrderHelper';
import { onlinePaymentConfig, payOnline, PaymentCancelled, type OnlinePaymentConfig } from '../../../services/razorpayCheckout';
import type { ProcessPaymentInput } from '../../../services/bookingHelper';
import { errorText, money } from './pharmacyV2Ui';

export default function PharmacyPaymentDialog({ order, onClose, onPaid }: {
  order: PatientOrderV2;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<OnlinePaymentConfig | null>(null);

  useEffect(() => {
    let active = true;
    onlinePaymentConfig().then((value) => { if (active) setConfig(value); }).catch(() => { if (active) setConfig(null); });
    return () => { active = false; };
  }, []);

  const pay = async () => {
    setBusy(true);
    setError('');
    try {
      const paid = await payOnline({
        amount: Number(order.total_amount),
        purpose: 'pharmacy',
        description: `Pharmacy order #${order.id.slice(0, 8).toUpperCase()}`,
      });
      const result = await payOrderApi(order.id, paid as unknown as ProcessPaymentInput);
      if (!result.success || result.payment_status !== 'PAID') {
        throw new Error(`${result.failure_reason || 'Payment was not completed.'} If money was taken it will be refunded automatically.`);
      }
      onPaid();
    } catch (failure) {
      setError(failure instanceof PaymentCancelled ? failure.message : errorText(failure, 'Payment could not be completed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <VizitoDialog
      title="Pay for your order"
      className="ph2-dialog"
      onClose={() => { if (!busy) onClose(); }}
      footer={<div className="ph2-dialog-actions">
        <button type="button" className="ph2-btn ph2-btn--ghost" disabled={busy} onClick={onClose}>Back</button>
        <button type="button" className="ph2-btn ph2-btn--primary" disabled={busy || config?.provider !== 'razorpay'} onClick={() => void pay()}>
          {busy ? 'Waiting for payment...' : `Pay ${money(order.total_amount)}`}
        </button>
      </div>}
    >
      <p>Amount payable: <b>{money(order.total_amount)}</b>{config?.test_mode ? ' (test mode)' : ''}</p>
      <p>Pay securely with UPI, card, net banking or wallet. Cancelled orders are refunded to the same method.</p>
      {config && config.provider !== 'razorpay' && <p role="alert">Online payment is not available right now. Choose pay on pickup/delivery instead.</p>}
      {error && <p role="alert" className="ph2-error">{error}</p>}
    </VizitoDialog>
  );
}
