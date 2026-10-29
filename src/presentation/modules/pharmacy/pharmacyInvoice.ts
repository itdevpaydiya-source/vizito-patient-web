import { paymentMethodLabel, shortOrderId } from '../../../utils/paymentLabels';
import type { ProviderDetail } from '../../../services/bookingHelper';
import type { PatientOrder } from '../../../services/types';
import { dateTime, money, paymentStateLabel } from './pharmacyV2Ui';

const patientTransaction = (value: string | null | undefined) => value && !/^VZT-SIM-/i.test(value) ? value : null;

/**
 * The browser print/save workflow uses only the authenticated order; no fabricated PDF.
 * Lives outside the old order page so the v2 detail screen can use it without importing
 * the legacy page (which would create a module cycle through OrderDetailScreen).
 */
export function printPharmacyInvoice(order: PatientOrder, provider: ProviderDetail | null) {
  if (order.payment_status !== 'PAID' || !order.invoice_number) throw new Error('An invoice is not available for this order.');
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Allow pop-ups to view your invoice.');
  const doc = popup.document;
  doc.title = `Vizito invoice ${order.invoice_number}`;
  const style = doc.createElement('style');
  style.textContent = 'body{font:14px Arial;padding:32px;max-width:800px;margin:auto;color:#101d48}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #ddd;padding:12px}dt{font-weight:bold;margin-top:12px}dd{margin:4px 0}button{padding:12px}@media print{button{display:none}}';
  doc.head.append(style);
  const heading = doc.createElement('h1');
  heading.textContent = `Invoice ${order.invoice_number}`;
  doc.body.append(heading);
  const details = doc.createElement('dl');
  const rows: [string, string | null][] = [
    ['Order ID', shortOrderId(order.id)],
    ['Pharmacy', provider?.business_name || null],
    ['Address', provider?.pharmacy?.address || null],
    ['Order date', dateTime(order.created_at)],
    ['Payment status', paymentStateLabel(order)],
  ];
  for (const [key, value] of rows) {
    if (!value) continue;
    const term = doc.createElement('dt');
    const detail = doc.createElement('dd');
    term.textContent = key;
    detail.textContent = value;
    details.append(term, detail);
  }
  doc.body.append(details);
  const table = doc.createElement('table');
  const head = table.createTHead().insertRow();
  for (const text of ['Medicine', 'Quantity', 'Unit price', 'Amount']) {
    const cell = doc.createElement('th');
    cell.textContent = text;
    head.append(cell);
  }
  const body = table.createTBody();
  for (const item of order.items || []) {
    const row = body.insertRow();
    for (const value of [item.medicine?.medicine_name, String(item.quantity), money(item.unit_price), money(item.subtotal)]) {
      row.insertCell().textContent = value || '';
    }
  }
  doc.body.append(table);
  for (const [key, value] of [
    ['Items total', money(order.subtotal_amount)],
    ['Delivery fee', money(order.delivery_fee)],
    ['Discount', money(order.discount_amount)],
    ['Total paid', money(order.total_amount)],
  ]) {
    const line = doc.createElement('p');
    line.textContent = `${key}: ${value}`;
    doc.body.append(line);
  }
  for (const payment of order.payments || []) {
    const line = doc.createElement('p');
    line.textContent = [
      paymentMethodLabel(payment.method),
      dateTime(payment.paid_at),
      patientTransaction(payment.transaction_number) && `Transaction ID: ${patientTransaction(payment.transaction_number)}`,
      payment.status,
    ].filter(Boolean).join(' · ');
    doc.body.append(line);
  }
  const button = doc.createElement('button');
  button.textContent = 'Print / Save invoice';
  button.onclick = () => popup.print();
  doc.body.append(button);
  popup.focus();
}
