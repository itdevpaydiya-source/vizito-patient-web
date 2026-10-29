import apiClient from "./index";
import { getPatientProfileApi } from "./patientHelper";

/**
 * Online payment through Razorpay Checkout.
 *
 * 1. `onlinePaymentConfig()` says whether real online payment is set up (`provider: 'razorpay'`) and
 *    whether it is test mode — show "Test mode" next to "Pay online" when `test_mode` is true, and
 *    hide online payment when the provider is `simulated` in production.
 * 2. `payOnline()` creates an order for the amount shown at Review & pay, opens Razorpay's own window
 *    (UPI, cards, net banking — card/UPI details never touch Vizito), and resolves with the fields
 *    to send as the booking's `payment` object. The booking endpoint verifies the payment with
 *    Razorpay and refuses it if the amount differs from the real fee.
 *
 * Usage in a booking flow:
 *   const paid = await payOnline({ amount: fee, purpose: 'doctor', description: 'Consultation with Dr. X', prefill });
 *   await createBooking({ ...form, payment: paid });
 * `payOnline` throws `PaymentCancelled` when the patient closes the window — keep them on Review & pay.
 */
export interface OnlinePaymentConfig { provider: "razorpay" | "simulated"; test_mode: boolean }
export class PaymentCancelled extends Error { constructor() { super("Payment cancelled. You have not been charged."); } }

export const onlinePaymentConfig = async (): Promise<OnlinePaymentConfig> =>
  (await apiClient.get("/bookings/payments/config")).data;

let scriptLoad: Promise<void> | null = null;
const loadCheckout = () =>
  (scriptLoad ||= new Promise<void>((resolve, reject) => {
    if ((window as any).Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => { scriptLoad = null; reject(new Error("The payment window could not load. Check your internet and try again.")); };
    document.body.appendChild(s);
  }));

export interface PaidOnline {
  payment_method: "UPI";
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function payOnline(input: {
  amount: number;
  purpose: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
}): Promise<PaidOnline> {
  await loadCheckout();
  // Razorpay asks for a mobile number / email it does not have; fill them from the patient's profile.
  const profile = !input.prefill?.contact || !input.prefill?.email ? await getPatientProfileApi().catch(() => null) : null;
  let rawEmail = input.prefill?.email || profile?.email || undefined;
  if (rawEmail) {
    rawEmail = rawEmail.trim().replace(/\.(demo|test|local|example|invalid)$/i, '.com');
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(rawEmail)) {
      rawEmail = 'patient@vizito.com';
    }
  }
  let rawContact = input.prefill?.contact || profile?.phone || undefined;
  if (rawContact) {
    const digits = rawContact.replace(/\D/g, '');
    rawContact = digits.length >= 10 ? digits.slice(-10) : undefined;
  }
  const prefill = {
    name: input.prefill?.name || profile?.fullName || undefined,
    contact: rawContact,
    email: rawEmail,
  };
  const order = (await apiClient.post("/bookings/payments/razorpay/order", { amount: input.amount, purpose: input.purpose })).data;
  // An open modal <dialog> sits in the browser's top layer and makes the rest of the page inert, so
  // Razorpay's window would open behind it, unclickable. Step those dialogs out while paying.
  const modals = Array.from(document.querySelectorAll<HTMLDialogElement>("dialog[open]")).filter((d) => d.matches(":modal"));
  modals.forEach((d) => { d.close(); d.style.display = "none"; });
  const restore = () => modals.forEach((d) => { d.style.display = ""; if (d.isConnected && !d.open) d.showModal(); });
  return new Promise<PaidOnline>((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key: order.key_id,
      order_id: order.order_id,
      amount: Math.round(order.amount * 100),
      currency: order.currency,
      name: "Vizito",
      description: input.description,
      prefill,
      theme: { color: "#0B4F4F" },
      handler: (r: any) => {
        // Checkout can remain on its "Confirming Payment" overlay even after the handler fires.
        // Close again after Razorpay finishes its callback bookkeeping, then remove only its own
        // stale container if the SDK left it mounted over the confirmation route.
        setTimeout(() => {
          rzp.close();
          document.querySelectorAll(".razorpay-container").forEach((node) => node.remove());
          document.body.style.overflow = "";
        }, 0);
        restore();
        resolve({
          payment_method: "UPI",
          razorpay_order_id: r.razorpay_order_id,
          razorpay_payment_id: r.razorpay_payment_id,
          razorpay_signature: r.razorpay_signature,
        });
      },
      // A failed attempt keeps Razorpay's window open so the patient can retry another way; closing it
      // ends the payment (with the failure reason, if an attempt failed).
      modal: { ondismiss: () => { restore(); reject(lastFailure ? new Error(lastFailure) : new PaymentCancelled()); } },
    });
    let lastFailure: string | null = null;
    rzp.on("payment.failed", (r: any) => { lastFailure = `${r?.error?.description || "The payment failed."} You have not been charged.`; });
    rzp.open();
  });
}
