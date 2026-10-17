import React from 'react';
import { X, Printer, FileText, Loader2 } from 'lucide-react';
import { hcInvoiceApi, type HcInvoice } from '../../../../services/homecareHelper';

interface HomeCareInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: any;
  orderId?: string;
}

export default function HomeCareInvoiceModal({
  isOpen,
  onClose,
  invoice: initialInvoice,
  orderId,
}: HomeCareInvoiceModalProps) {
  const [data, setData] = React.useState<any>(initialInvoice || null);
  const [loading, setLoading] = React.useState<boolean>(!initialInvoice && !!orderId);

  React.useEffect(() => {
    if (initialInvoice) {
      setData(initialInvoice);
      setLoading(false);
    } else if (orderId) {
      setLoading(true);
      hcInvoiceApi(orderId)
        .then((res) => setData(res))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }
  }, [initialInvoice, orderId]);

  if (!isOpen) return null;

  const invoice = data;

  // A tax invoice shows ONLY what the server issued (GET /home-care/orders/:id/invoice): no invented
  // names, addresses, numbers, SAC codes or tax notes. Missing values are simply left out.
  const sup = invoice?.supplier || invoice?.agency || {};
  const agencyName: string = sup.name || '';
  const agencyAddress: string = sup.address || '';
  const agencyGstin: string = sup.gstin || '';
  const agencyPhone: string = sup.phone || '';
  const ceReg: string = sup.clinical_establishment_reg || '';

  const invoiceNumber: string = invoice?.invoice_number || '';
  const invoiceDate = invoice?.date ? new Date(`${String(invoice.date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB') : '';
  const orderNumber: string = invoice?.order_number || '';

  const billed = invoice?.billed_to || invoice?.patient || {};
  const patientName: string = billed.name || '';
  const patientAddress: string = [billed.address, billed.pincode].filter(Boolean).join(' · ');
  const patientPhone: string = billed.phone || '';

  const items: Array<{ description: string; sac?: string; quantity: number; rate: number; amount: number }> =
    (invoice?.lines || []).map((l: any) => ({
      description: l.description || '',
      sac: l.sac || undefined,
      quantity: Number(l.quantity || 0),
      rate: Number(l.rate || 0),
      amount: Number(l.taxable_value ?? Number(l.rate || 0) * Number(l.quantity || 0)),
    }));

  const subtotal = items.reduce((s, it) => s + (it.amount || 0), 0);
  const taxRate = Number(invoice?.gst?.rate ?? 0);
  const taxAmount = Number(invoice?.gst?.total ?? 0);
  const total = Number(invoice?.total ?? subtotal + taxAmount);
  // Paid online at booking = nothing due; pay-at-visit = the total is due. Refunds are shown by the server.
  const advancePaid = String(invoice?.payment?.status || '').toUpperCase() === 'PAID' ? total : 0;
  const balanceDue = Math.max(0, total - advancePaid);
  const taxReason: string = invoice?.gst?.note || '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tax Invoice"
        className="bg-white rounded-3xl max-w-2xl w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-400 min-w-0">
            <FileText className="w-4 h-4" />
            <span>Tax Invoice / Statement</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              disabled={loading || !invoice}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
            <p className="text-xs font-semibold">Generating invoice statement...</p>
          </div>
        ) : !invoice ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-sm font-semibold">No invoice statement available for this order.</p>
          </div>
        ) : (
          <div className="p-8 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs" data-testid="homecare-invoice-modal">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">{agencyName}</h2>
                <p className="text-slate-500 mt-0.5">{agencyAddress}</p>
                {ceReg && (
                  <p className="text-slate-500 mt-0.5">Clinical Establishment reg.: <b className="text-slate-800">{ceReg}</b></p>
                )}
                {agencyGstin && (
                  <p className="text-slate-500 mt-0.5">GSTIN: <b className="text-slate-800">{agencyGstin}</b></p>
                )}
                {agencyPhone && (
                  <p className="text-slate-500">Phone: {agencyPhone}</p>
                )}
              </div>
              <div className="text-right">
                <div className="text-base font-black text-teal-800">TAX INVOICE</div>
                <div className="text-slate-600 font-bold mt-1">Invoice #: {invoiceNumber}</div>
                <div className="text-slate-500 mt-0.5">Date: {invoiceDate}</div>
                <div className="text-slate-500 mt-0.5">Order #: {orderNumber}</div>
              </div>
            </div>

            {/* Billed To */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Billed To (Patient / Primary Family Member)
              </div>
              <div className="font-black text-sm text-slate-900">{patientName}</div>
              {patientAddress && <div className="text-slate-600 mt-0.5">{patientAddress}</div>}
              {patientPhone && <div className="text-slate-600">Phone: {patientPhone}</div>}
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-[11px] font-black uppercase text-slate-500">
                  <th scope="col" className="py-2">Description</th>
                  <th scope="col" className="py-2">SAC</th>
                  <th scope="col" className="py-2 text-center">Qty</th>
                  <th scope="col" className="py-2 text-right">Rate</th>
                  <th scope="col" className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">
                      No line items recorded
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-3 pr-2 break-words min-w-0">
                        <div className="font-bold text-slate-900 break-words">{item.description}</div>
                      </td>
                      <td className="py-3 text-slate-600">{item.sac || '—'}</td>
                      <td className="py-3 text-center font-semibold">{item.quantity}</td>
                      <td className="py-3 text-right">₹{item.rate.toLocaleString('en-IN')}</td>
                      <td className="py-3 text-right font-bold text-slate-900">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Totals Summary */}
            <div className="border-t-2 border-slate-200 pt-4 space-y-2 max-w-xs ml-auto">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST ({taxRate}%):</span>
                <span className="font-semibold">₹{taxAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                <span>Total Invoice Amount:</span>
                <span>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Advance Paid:</span>
                <span>-₹{advancePaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t-2 border-slate-300">
                <span>Net Balance Due:</span>
                <span className={balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                  ₹{balanceDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Tax Exemption Note */}
            {taxReason && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed">
                <b>GST note:</b> {taxReason}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
