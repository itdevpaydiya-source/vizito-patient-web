# Online payment with Razorpay (test mode) — how to wire a booking flow

Built 2026-10-28 (Claude). ONE payment system for every Vizito business. Keys live only in `vizito-replica-backend/vizito-booking/.env` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`); never print, log or copy them, and never add them to another service. Other services (vizito-catalogue: pharmacy, equipment rental) verify and refund through the booking service's internal endpoints `POST /bookings/payments/internal/verify` and `/internal/refund` (system role only; patients get 403).

## Backend (done)
- `GET /bookings/payments/config` → `{provider: "razorpay"|"simulated", test_mode}`.
- `POST /bookings/payments/razorpay/order {amount, purpose}` → `{order_id, amount, currency, key_id, test_mode}`.
- Every booking flow that charges through `PaymentsService.chargeAmount` now verifies Razorpay when keys are set: doctor/hospital appointments, lab orders, doctor home visits, home care visits, ambulance, blood requests. Send the booking's `payment` object as `{payment_method: "UPI", razorpay_order_id, razorpay_payment_id, razorpay_signature}`. The server checks the signature, that the payment belongs to the order, that the amount equals the real fee, captures it, and refuses a payment id already used.
- Without keys the old labelled simulation still works.

## Frontend (helper done, flows to wire)
`src/services/razorpayCheckout.ts`: `onlinePaymentConfig()`, `payOnline({amount, purpose, description, prefill})`, `PaymentCancelled`.
In each flow's Review & pay:
1. Payment choice cards: "Pay at <venue>" and "Pay online" (Razorpay window offers UPI, cards, net banking). Show a small "Test mode" chip when `test_mode` is true.
2. On confirm with online: `const payment = await payOnline(...)` → send the booking with `payment`. Remove the old UPI-ID / card-last-4 inputs (Razorpay collects those).
3. `PaymentCancelled` → stay on Review & pay, message "Payment cancelled. You have not been charged." Other errors → show the message, offer Retry and Pay at venue.
4. Booking error after payment (e.g. slot just taken) → show it and tell the patient the amount is being refunded (doctor/hospital refund at once; see Refunds below).

Test payments (test mode, no real money): UPI `success@razorpay` (succeeds) / `failure@razorpay` (fails); card 4111 1111 1111 1111, any future expiry, any CVV, OTP from the test page.

## Refunds (done 2026-10-28)
- Cancellation rules are unchanged (each service decides: full refund while Vizito still holds the money, otherwise support). `RazorpayRefundWorker` (vizito-booking) runs every minute and returns the money through Razorpay for every `transactions` row with a Razorpay payment (`pay_…`) that became `Refunded`, and for a home-care late-cancellation row it refunds everything except the fee. It stores `gateway_refund_id` (or `gateway_refund_error`, retried for a day). Lab payments stuck in `REFUND_DUE` are refunded in full. Retries are safe (Razorpay amount_refunded is checked first).
- Doctor/hospital: if the payment succeeds but the booking cannot be saved, the payment is refunded immediately.
- UI: show "Refund of ₹X started — it reaches your account in 5–7 working days" after a cancellation of an online payment (Razorpay normal refund speed). The real payment method (UPI / CARD / NET_BANKING / WALLET) is recorded on the transaction for doctor/hospital bookings.
- Walk to verify: pay with success@razorpay, cancel, wait ~1 minute, see the refund in the Razorpay test dashboard.

## Patient screens wired (2026-10-28, Claude)
| Flow | Screen | Status |
|---|---|---|
| Equipment rental | EquipmentCheckoutScreen | walked: paid, cancelled, refunded |
| Pharmacy | PharmacyOrderPages PaymentDialog (Pay now on the order) | walked: ₹90 paid by card, cancelled, Razorpay refunded ₹90 |
| Home care (visits & courses) | HomeCareJourney review step | walked: ₹500 paid by card, cancelled, Razorpay refunded ₹500 |
| Home care agency booking | HomeCareAgency | wired |
| Home care long-term quote | QuoteReviewModal | wired |
| Doctor home visit | HomeCareScreen (doctor tab) | walked: ₹1,000 paid, cancelled, Razorpay refunded ₹1,000 |
| Ambulance (pay after trip) | MyAmbulanceTripsScreen PayOnline | wired; needs a completed unpaid trip to walk |
| Blood processing charge | MyBloodRequestsScreen | wired; needs a READY request to walk |
| Hospital OPD | HospitalBooking (Agent 2) | Agent 2 |
| Doctor appointment / lab | Agent 2 doctor redesign / lab redesign | pending |
`payOnline()` fills name / phone / email from the patient profile when the screen does not pass them (otherwise Razorpay asks for a mobile number first). Pharmacy now records the real method Razorpay used (CARD, UPI…).

## Not done yet (follow-ups)
- Pharmacy: on Razorpay through the internal endpoints (checkout result → verify; order refunds → internal refund). The pharmacy pay screen must switch to `payOnline({purpose:'pharmacy'})` and send the razorpay_* fields to `POST /orders/:id/payment`.
- Equipment rental: DONE 2026-10-28 (Claude). Checkout confirm dialog has "Pay on delivery" / "Pay online now" cards; online sends `payment` with `POST /rental/patient/orders`; catalogue verifies the exact rent + delivery total through the booking internal endpoint, refuses reused payment ids, refunds at once if the order can't be saved. Deposit is still collected at delivery. Cancel (patient) or decline (provider) refunds in full; failed refunds retry every 10 min for 3 days (`retryFailedRefunds`). Confirmation and details screens show paid-online / refund status. Walked in the real UI with a test card (order RO-20261028-2188).
- Test-mode limit: refunds come out of the Razorpay account balance. The test account balance is small, so large test refunds fail with "invalid request sent" until balance exists; the retry covers this. Same risk in live mode when balance is low.
- Test card: use the Indian Mastercard 5267 3181 8797 5449 (4111… is treated as international and refused), any future expiry, any CVV, any OTP.
- `payOnline()` now steps open Vizito dialogs out of the browser top layer while Razorpay is open (otherwise the Razorpay window is behind the dialog and unclickable), and keeps the window open after a failed attempt so the patient can retry.
- Webhook (needed on the server for late UPI confirmations) — add with `RAZORPAY_WEBHOOK_SECRET` at deploy time.
