# Home care v2 redesign - progress

Design reference: `D:\Vizito-latest6\design\homecare-v2-1-home.png` … `homecare-v2-6-confirmed.png` (6 screens).

**Status: all six screens rebuilt and walked as Kavya (online payment + refund, pay-after booking, cancel, reschedule/track, 12h/24h quote). `tsc` clean, no horizontal overflow at 1280 or 390. No open blockers (one API-level limitation on a second long-term enquiry, see gaps).**

## Rules for this work
- Only `src/presentation/modules/homecare/**` and `src/services/homecareHelper.ts` may change.
- Existing routes only. No new route was registered.
- Real API data only: no invented agency, price, rating, distance, professional, visit code or refund.
- Null fields are hidden, never filled with a placeholder value.
- Every screen has loading, empty and error + Retry states; desktop 1280 px and phone 390 px; no horizontal scroll.
- Existing behaviour kept: Razorpay `payOnline` wiring, 108 emergency strip, family-member choice, referral upload, visit code, cancel/refund policy.
- No server restarts, no git commits.

## Screen map

| Design screen | Route | Component |
| --- | --- | --- |
| 1. Home care landing | `/home-care` | `HomeCareV2.tsx` (`LandingPage`) |
| 2. Service / packages | `/home-care?tab=nursing` (also `physio`, `caregiver`) | `HomeCareV2.tsx` (`ServicePage`) |
| 3. Agency selection | `?tab=nursing&step=agency&package=<key>` | `HomeCareV2.tsx` (`AgencyPage`) |
| 4. Schedule & details | `?step=schedule&package=…&agency=…` | `HomeCareV2.tsx` (`SchedulePage`) |
| 5. Review & pay | `?step=review&…` | `HomeCareV2.tsx` (`ReviewPage`) |
| 6. Booking confirmed | `?step=confirmed&order=<id>` | `HomeCareV2.tsx` (`ConfirmedPage`) |
| 12h / 24h quote | `/home-care`, hero button (legacy `?track=longterm` auto-opens it) | reused `components/LongTermEnquiryModal.tsx` |

Routing lives in `HomeCareScreen.tsx`: `?tab=mine` still renders the existing `HomeCareVisits`, `?tab=doctor` still renders the existing doctor flow, and every other tab renders `HomeCareV2`. `HomeCareJourney` is no longer routed but its file is untouched.

Wizard state is in the URL (`step`, `package`, `agency`, `service`, `order`), so refresh and back/forward work and a confirmed booking can be reopened from `?step=confirmed&order=…`.

## Done

### Screen 1 - Home care landing
- Hero banner `banners/homecare-hero.webp`, headline, "Book a visit" / "Request a 12h / 24h quote", trust row.
- 108 red strip with `tel:108` kept at the top of the flow.
- Services grid: Nursing, Physiotherapy, Caregivers, Doctor at home (existing doctor tab), Lab tests (existing lab route). Each card links into the real flow.
- "Choose how you need care": Book a visit, 12h / 24h quote, long-term care quote - all lead to real actions, not dead cards.
- "Why Vizito home care" uses only claims the product can back (real agency names, shown qualifications, the agency's own price, visit codes), no "verified agency" badge.
- Location row shows the saved search area / PIN only when one is known; nothing is assumed.

### Screen 2 - Service & packages
- Packages are built from the live catalogue (`GET /home-care/catalogue?pincode=&lat=&lng=`) grouped by `category : kind : duration`; each card is one real service type, not one row per agency.
- "from ₹X" is `min(price)` across the agencies that actually offer that exact service; the per-visit / per-shift line and duration come from the catalogue.
- Category scoping: a nursing URL can only ever pick a nursing package, a stale `package=` key from another category is ignored.
- Each card shows the agency count, who provides it, and one "Choose agency" action.
- The selected package is highlighted; "from" price is never used as the booking price.
- Loading skeleton, empty state ("no services for this PIN"), error + Retry.

### Screen 3 - Agency selection
- Real agency rows for the selected package: logo when `logo_url` exists, otherwise agency initials; name; `on_vizito_since` as "On Vizito since Mon YYYY"; opening hours; staff count; available genders; languages; qualification(s); average experience; earliest visit date; distance when `distance_km` is present.
- Rating is **not** shown because the live catalogue returns no rating; no star row is invented. Distance is hidden when null.
- Filters: language, female professional available, price band. Sort: lowest price, earliest visit. Both operate on the already-loaded catalogue; a filter that matches nothing shows an empty result with "Clear all".
- Selecting an agency stores the cheapest matching service for that package at that agency (`serviceForAgency`) and moves to Schedule, so the price on Review is that agency's real price.
- Loading, empty, error + Retry.

### Screen 4 - Schedule & details
- Patient: Self or a real family member from `getFamilyMembersApi()`; the shared `BookingForChip` selection is honoured.
- Address: saved addresses from `getAddressesApi()` (fills line/area/city/PIN), manual fields, `HomePinField` to pin the home location for distance, landmark.
- Care need: condition/reason, mobility (walks independently / with support / wheelchair / bed-bound), notes, optional referral upload (`recordsApi.upload`, PDF/JPG/PNG up to 10 MB) with the existing doc-type selector; upload errors are shown inline and the file can be removed.
- Schedule: date strip built from the agency's real opening hours and the package's earliest slot, then real time-slot groups; past dates and closed hours cannot be picked. Sessions stepper for visit packages.
- Preferred professional gender (`ANY` / female / male) and a price summary that matches the selected service.
- Inline validation with a single error line; no silent disabled buttons.

### Screen 5 - Review & pay
- Read-only summary with Edit links back to Service / Agency / Schedule: patient (self or family member by name), service + duration, agency, date and time window, address, care need, referral file name.
- Price: service price × sessions, total; no hidden fee invented.
- Payment choice: **Pay after visit** is the default (`CASH`). **Pay online now** uses the existing `payOnline({ purpose: 'home_care', amount, description, prefill })` Razorpay window; on success the booking is created with `payment_mode: 'UPI'` and the verified payment object. Closing the Razorpay window (`PaymentCancelled`) keeps the patient on Review with a message.
- "Test mode" is shown when `PAYMENTS_SIMULATED`; the test-payment note is the shared `TestPaymentNote`.
- Cancellation policy text and the 108 "not for emergencies" note stay on the page.
- Submit is disabled while busy; API errors are shown in a banner and the form is kept.

### Screen 6 - Booking confirmed
- Success header with the real booking ID (`HC-…`) and payment badge (`Paid online · test mode ₹500`, `Pay after visit · ₹500`, `Refunded ₹500`, or `No payment taken`).
- Visit code card from the real visit (`3534` in the walked booking) with the "share only when the professional arrives" copy.
- Assigned professional: name, role, qualification, experience, representative photo labelled "Photo is representative."; **never a star rating**. Before assignment the card reads "Being assigned" and explains what will appear.
- Agency card with the real phone (`tel:` link), service and visit count.
- Timeline from the order's `timeline` (Requested → Confirmed → Professional assigned → Visits in progress → Completed) with real timestamps; future steps read "Next"/"Pending", not "In progress".
- Actions: Track professional, Cancel booking, Reschedule visit (when `can_reschedule`), Add to calendar (real `.ics` from the order), Contact agency, Booking details.
- Booking details: service, patient, address, payment lines with transaction/receipt numbers when present.
- Cancelled bookings keep the same page: cancellation status, refund status and amount, the reason, and a "Book again" action. Refund banner and badge are shown once, not duplicated.
- Track dialog: per-visit date/time, status milestones (Scheduled / On the way / Arrived / Started / Done), assigned professional and visit code, plus "Live location is not shared." - there is no fake map.
- Cancel dialog: policy summary and what will happen to the payment; cancellation calls `hcCancelApi` and re-reads the order.
- Reschedule dialog: calls `hcRescheduleApi`, surfaces the API's unavailable reason when rescheduling is blocked.
- Loading, error + Retry, and "booking not found" states.

### States, responsiveness, honesty
- Loading skeletons on Service/Agency/Confirmed; empty states on Service/Agency; error + Retry on Service/Agency/Confirmed and on the order load.
- No horizontal overflow at 1280 or 390 (checked through `documentElement.scrollWidth` on every captured screen).
- All v2 styles are scoped under `.hc2` in `HomeCareV2.css`; no global token or shared-component changes.
- Nothing claims "verified professional", a star rating, a live map, or a distance the API did not return.

## Data rules used
- Catalogue: `hcCatalogueApi(pincode, category?, lat?, lng?)` → `{ pincode, services }`. `HcService` now carries optional `logo_url`, `on_vizito_since`, `distance_km` (additive only).
- Package key: `category:kind:duration`. "from" price = lowest real price in the group. Selected agency's service = cheapest service in that group for that agency.
- Earliest visit: `agency.earliest_visit` / `next_available` when present; otherwise the first bookable slot from opening hours. The schedule defaults to the earliest real date, not a hard-coded "tomorrow".
- Live catalogue at walk time: 6 services, one agency (`CareFirst Home Health`), PINs 500084 / 500081, hours 6:00–22:00, earliest 29 Oct 2026 06:00; ratings, logos and distances all null, so those rows are simply absent.
- Assigned professional: `visit.professional` name / role / qualification / `experience_years` only. `phone` is null in the catalogue and is not shown.
- Money: `money()` / `rupees()` from the shared helpers; no client-side fee maths beyond `price × sessions`.

## Files changed
- `src/presentation/modules/homecare/HomeCareV2.tsx` - new v2 controller, all six screens, cancel/track/reschedule dialogs, URL state.
- `src/presentation/modules/homecare/HomeCareV2.css` - new `.hc2` scoped stylesheet, responsive at 1280 / 390.
- `src/presentation/modules/homecare/homeCareV2Data.ts` - package grouping, money/date/slot/calendar helpers, status labels, initials.
- `src/presentation/modules/homecare/HomeCareScreen.tsx` - routes non-doctor/non-mine tabs to `HomeCareV2`; old `HomeCareJourney` import removed.
- `src/services/homecareHelper.ts` - additive optional fields (`logo_url`, `on_vizito_since`, `distance_km`) and optional `lat` / `lng` on the catalogue call.
- `HOMECARE_REDESIGN_PROGRESS.md` - this file.

Not touched: `HomeCareJourney.tsx`, `HomeCareAgency.tsx`, `HomeCareVisits`, doctor flow, `LongTermEnquiryModal.tsx`, shared components, routes, backend, database.

## Walked as Kavya (8866314762)
1. `/home-care` → landing → Nursing → package → agency (CareFirst, 1 professional, B.Sc Nursing, 8 yrs avg, English/Hindi/Telugu) → schedule (family member, address, condition, referral optional) → Review → **Pay online now** → Razorpay test card `5267318187975449` / `12/30` / `123` / OTP `123456` → confirmed `HC-20261029-327947` (`508113ed-defc-4d97-b112-32e2225aa03a`) paid ₹500 → **Cancel booking** → `REFUNDED ₹500`, one refund banner, timeline shows Cancelled.
2. Same schedule → Review → **Pay after visit** → confirmed `HC-20261029-080802` (`7ca8f47a-6a9e-41a2-9484-8ae589ff94c2`) → Cancel → "No payment taken", no refund line.
3. Assigned booking `HC-20261026-427082` (`8665925a-b424-445d-8b9c-2f6fca0a9c07`, paid ₹500) → professional card "Anitha Joseph · Nurse · B.Sc Nursing · 8 years experience", "Photo is representative.", visit code `3534` → **Track professional** → visit statuses + "Live location is not shared.", no map.
4. Unassigned request `HC-20261027-978512` (`30874bc4-223f-4bf6-96f4-8536609de6b1`, pay after) → "Being assigned" card.
5. Landing → **Request a 12h / 24h quote** → 3-step modal (care type, shift, condition → start date/duration → address) → submit. The API refused a second CareFirst enquiry because `HCE-20261026-02455` is already open; the modal shows that server message instead of a fake success. `?track=longterm` opens the same modal directly.
6. Error/empty: catalogue 500 → error + Retry on Service; empty `{services: []}` → empty state; order 500 → "Could not load this booking" + Retry. Captured on both widths.
7. Regression smoke: `?tab=doctor`, `?tab=mine` and `?track=longterm` all still open their intended screens with no console errors.

## Checks
- `npx tsc --noEmit -p tsconfig.app.json` - clean, no output.
- No horizontal overflow at 1280 × 900 or 390 × 844 on home, service, agency, schedule, review, confirmed, cancelled, track, quote and both error states.
- No console or page errors on the normal flows; the only console errors in the final run are the intentionally aborted `catalogue`/`orders` requests used to capture the error states.
- Refund verified against the API: `payment_status: REFUNDED`, `refund { status: REFUNDED, amount: 500 }`, payment row `REFUNDED`; pay-after order stays `payment_status: PENDING` with no refund object.
- Assigned professional verified against the API: `Anitha Joseph`, `Nurse`, `B.Sc Nursing`, `8` years, `FEMALE`; no rating field used anywhere in v2.
- The date on Review reads "Thursday, 29 Oct 2026", and the package price on Review equals the agency's real ₹500.
- Confirmed-page timeline fits all five steps on a phone: 348 px of content in 348 px at 390 wide, no inner horizontal scrolling.

## Screenshots

`C:\Users\itdev\AppData\Local\Temp\opencode\hc-shots\final\`
- 1280: `d1-home`, `d2-service`, `d3-agency`, `d4-schedule`, `d5-review`, `d6-confirmed`, `d7-cancelled`, `d8-track`, `d9-quote`, `d10-service-error`, `d11-service-empty`, `d12-confirm-error`.
- 390: `m1-home`, `m2-service`, `m3-agency`, `m4-schedule`, `m5-review`, `m6-confirmed`, `m7-cancelled`.

`C:\Users\itdev\AppData\Local\Temp\opencode\hc-shots\v2\` - payment and quote evidence: `15-online-rzp-*`, `16-confirmed-online-desktop`, `18-cancelled-online-desktop`, `19-confirmed-payafter-desktop`, `20-cancelled-payafter-desktop`, `21`–`24-quote-*`, plus `40-confirmed-assigned-desktop`, `41-track-dialog-desktop`, `42-cancelled-fixed-desktop`, `43-service-mobile-fixed`, `44-longterm-deeplink-mobile`, `45-confirmed-assigned-mobile`.

Scripts: `hc-v2-walk.mjs` (payment + quote walk), `hc-v2-verify.mjs` (assigned professional, track, cancelled, long-term deep link), `hc-v2-final.mjs` (final screenshots + mocked error/empty states), all in `C:\Users\itdev\AppData\Local\Temp\opencode\`.

## Known problems / gaps
- The live catalogue has one agency and no rating/logo/distance, so the rating row, logo images and distance chips never appear for PIN 500084/500081. The UI hides them rather than inventing values; with a richer catalogue the same code renders them.
- Only one agency serves the walked PINs, so language/gender/price filters and sorting have no visible effect there. Filtering to zero results shows the empty state.
- A second 12h/24h enquiry for CareFirst is refused while `HCE-20261026-02455` is open. The modal shows the server message; the patient has to wait for that enquiry to close or contact support.
- Doctor at home and My bookings & quotes deliberately keep the existing screens (design covers nursing/physio/caregiver); the new v2 shell only owns the three home-care service tabs and the booking wizard.
- Reschedule depends on the order's `can_reschedule`; when the API blocks it, the action stays visible only if allowed and the dialog shows the server's reason.
- The professional photo is a gender placeholder, labelled "Photo is representative." - the catalogue exposes no real photo.
- Refunds are recorded in test mode; the banner says no real bank transfer is made.
