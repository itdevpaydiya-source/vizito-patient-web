# Ambulance v2 redesign - progress

Design reference: `D:\Vizito-latest6\design\ambulance-v2-1to5.png` (5 screens).

**Status: all five screens rebuilt and walked; polish pass (real route estimate + map line, orange primary, roomier type cards, one-line phone trip actions) done. No open blockers.**

## Rules for this work
- Only `src/presentation/modules/ambulance/**` and `src/services/ambulanceHelper.ts` may change.
- Existing routes only: `/book-ambulance` (home + wizard), `/ambulance-trips` (list + live/completed trip), `/urgent-ambulance` (untouched design), `/ambulance-dispatch` (redirect, untouched).
- Real API data only. Missing fields are hidden; no mockup names, registrations, prices or hospitals.
- Every screen: loading, empty, error + Retry, mobile 390 px + desktop 1280 px, no horizontal scroll.
- No server restarts, no git commits.

## Screen map

| Design screen | Route | Component |
| --- | --- | --- |
| 1. Ambulance home | `/book-ambulance` | `BookAmbulanceScreen.tsx` |
| 2. Book ambulance (wizard + review & pay) | `/book-ambulance?transfer=DISCHARGE` | `ScheduledBookingForm.tsx` |
| 3. Review & pay | wizard step 4 of the same form | `ScheduledBookingForm.tsx` |
| 4. Live trip tracking | `/ambulance-trips?open=<trip id>` | `MyAmbulanceTripsScreen.tsx` (`TripDetails`, live state) |
| 5. Trip completed | `/ambulance-trips?open=<trip id>` | `MyAmbulanceTripsScreen.tsx` (`TripDetails`, completed state) |
| My trips list | `/ambulance-trips` | `MyAmbulanceTripsScreen.tsx` |

## Done

### Screen 1 - Ambulance home
- 108 red strip + call button kept, hero banner `ambulance-hero.webp`, "Set your location" bar.
- Three action cards: Urgent (goes to `/urgent-ambulance`), Scheduled transfer (opens the wizard), Event standby (opens an explainer dialog; standby cover is arranged by support, CTA goes to `/help`).
- "My trips" preview table from real data; cancelled/declined/expired rows show fare `-`.
- Loading skeleton, empty state, error + Retry.

### Screen 2 - Book ambulance (4 steps)
1. Pickup & drop (saved addresses, map pin confirm, transfer type, date/time, destination).
2. Ambulance type - all three types listed; BLS has a real quote, PTA/ALS stay disabled with the API's real "no Vizito rate" reason. No invented prices.
3. Patient details (who is travelling, phone, mobility, document upload + consent).
4. Review & pay - route, patient, fare breakdown, payment option, confirm.
- Sticky footer with Continue / Review & pay / Confirm booking on every step; step 1 footer states that types and fares come next.
- Route estimate API is called with the confirmed pickup pin and the destination pin (`pickup_lat/lng`, `drop_lat/lng`, plus `operator_partner_id` + `vehicle_type` when known). It returns the road km, minutes, fare for the selected type and the route polyline.
- Step 1 shows the big "≈ 10.2 km · 15 min" line and draws the real route on the map; a typed destination with no pin keeps the honest "distance is not available yet" text.
- Fare shown = API base fare (+ per-km estimate from the road km when the route API answers). Final fare only after the trip.
- Only "Pay after the trip" is selectable at booking; online payment is offered on the completed trip.
- Manual-operator fallback when the dispatch/operator list is empty, retry on document upload after booking is created.
- Error banner + Retry, disabled-button explanations in `aria-describedby` notes.

### Screen 3 - Review & pay
- Read-only summary of pickup, drop, transfer type, schedule, vehicle type, patient, fare lines and payment; shows the road distance/time and the "Estimated fare ≈ ₹X (base + per km × km beyond included; final fare after the trip)" line when the route is known.
- Operator-acceptance note; confirm action in the footer.

### Screen 4 - Live trip tracking
- Status milestones, map, driver / vehicle / crew (with call links), equipment, share trip link, cancel booking with dialog and reason.
- Cancel is disabled with a reason when the API says it is too late.
- Polls trip state; loading, error + Retry.

### Screen 5 - Trip completed
- Final fare breakdown, payment status, receipt view/download, "Book again".
- Operator rating only (`trip.operator.rating` + `review_count`), never a driver star rating.
- "Rate this trip" (stars, tags, review) shown only when `can_rate`; submits with `rateTripApi`; after submit and after reload the card reads "You rated this trip N/5."
- `PayOnline` kept and wired for post-trip payment when the fare is unpaid.

### My trips list
- `VizitoPagination` (10/20 per page), search/status filters, awaiting-acceptance request cards (cancel request, document upload), error + Retry, empty state.

### Polish pass
- Route estimate is real: `routeEstimateApi` sends pins and optional operator/vehicle type; responses carry `km`, `minutes`, `estimated_fare` and a `route` polyline. Step 1 shows "≈ 10.2 km · 15 min", draws the orange route with a teal destination marker, and Review shows "Distance ≈ … km · … min" plus "Estimated fare ≈ ₹1,545 (₹1,500 base + ₹45/km × 1 km beyond 10 km); final fare after the trip".
- When the API answers `available:false` (no pin, routing down) the card and Review keep the current honest text instead of inventing a distance.
- Buttons and accents use the orange primary `#E8590C` (hover `#C44707`) in `.amb2`; the fare tints were re-tinted to match.
- Ambulance type cards: full-width page, three cards of ~290 px at 1280 with image on top, name, price line, rate line and three rate-derived ticks (first km included, waiting per 15 min, final fare from the odometer). PTA/ALS keep the disabled "No Vizito rate is set" state.
- Step 1 footer pairs the fare estimate with "What happens next" side by side; on phones the map now sits directly under the pickup card, before the destination card.
- Completed-trip actions stay on one line on phones: nowrap row, three equal buttons, 11 px labels ("View receipt", "Download receipt", "Book again").
- Cancelling an awaiting request now leaves a named status line ("Request AS-… cancelled. No ambulance is coming for it.") instead of the card vanishing silently.

## Files changed
- `src/presentation/modules/ambulance/BookAmbulanceScreen.tsx` - home screen, `?transfer=` entry, `loadInfo()` always runs (deep-link fix).
- `src/presentation/modules/ambulance/ScheduledBookingForm.tsx` - 4-step wizard, quotes, patient step, review, footer confirm.
- `src/presentation/modules/ambulance/MyAmbulanceTripsScreen.tsx` - list, await cards, live, cancelled, completed, receipt, rating, payment.
- `src/presentation/modules/ambulance/AmbulanceV2Parts.tsx` - new shared primitives for this redesign.
- `src/presentation/modules/ambulance/AmbulanceV2.css` - new `.amb2` scoped stylesheet (imports `AmbulanceJourney.css`).
- `src/presentation/modules/ambulance/TransferNoteSection.tsx` - markup kept as-is; copy differs for completed trips ("No transfer note was shared for this trip.").
- `src/presentation/modules/ambulance/JourneyParts.tsx` - hospital hits and saved addresses pass their real pin to the destination step.
- `src/presentation/modules/ambulance/PickupPicker.tsx` - optional route polyline + destination marker; map opens on Hyderabad (or the saved search area) so a tap lands in the city.
- `src/services/ambulanceHelper.ts` - `RouteQuery`/`RouteEstimate` with route points, `routeEstimateApi`, hospital search returns pins; `TripReceipt` extended with optional receipt fields.
- `AMBULANCE_REDESIGN_PROGRESS.md` - this file.

Not touched: `UrgentAmbulanceScreen.tsx`, `TripTrackingMap.tsx`, `TrackingDetails.ts`, shared components, navigation, backend, database.

## Walked (Kavya, 8866314762)
1. `/book-ambulance` - home, real recent trips.
2. Schedule ambulance -> step 1 pickup/drop + map pin -> step 2 BLS quote -> step 3 patient -> step 4 review -> Confirm booking -> landed on `/ambulance-trips?scheduled=<id>` with "AS-261028-CC4633" awaiting acceptance -> Cancel request -> list refreshed.
3. My trips list -> completed trip `AT-261027-FE617F` -> View receipt -> Rate this trip (4 stars, "Crew behaviour", review text) -> Submit -> "You rated this trip 4/5." -> reload -> still rated (operator review count 1 -> 2).
4. Live trip `AT-261024-197234` (`ASSIGNED`) - milestones, driver/vehicle/crew, share link, cancel dialog + "Keep trip".
5. Error state (aborted trip + scheduled APIs), empty state (mocked empty responses), loading state (delayed responses) all captured.
6. Polish walk (after route estimate): map pin at Banjara Hills + Sunrise Multispeciality Hospital → route card "≈ 10.2 km · 15 min" and 3 map paths (route + markers) → type cards (290 px each) → patient → Review (distance + "Estimated fare ≈ ₹1,545…") → Confirm booking → "AS-261028-75472F" awaiting → Cancel request.
7. Final desktop capture repeated end to end → "AS-261028-B81E9D" awaiting → Cancel request → status line "Request AS-261028-B81E9D cancelled. No ambulance is coming for it."
8. Same walk at 390 px → "AS-261028-BF618D" → cancelled; completed trip `AT-261027-FE617F` actions measured: three 113 px buttons, 42 px high, row 350 px, `white-space: nowrap`.

## Checks
- `npx tsc --noEmit -p tsconfig.app.json` - clean from scratch (build info removed before the run), no output.
- No horizontal overflow at 1280 or 390 on any screen (`main.scrollWidth == main.clientWidth`, `window.innerWidth == documentElement.scrollWidth`).
- No console or page errors on normal flows; only the intentionally aborted requests in the error-state run.
- Phone completed-trip action row: `scrollWidth == clientWidth` (350 px), three buttons on one line; `route_estimate` verified against the API for BLS with operator (10.1 km / 14 min / ₹1,545 / 41 route points).

## Screenshots
`C:\Users\itdev\AppData\Local\Temp\opencode\amb-shots\final\`
- 1280: `01-home`, `02-book-pickup`, `03-book-type`, `04-book-patient`, `05-book-review`, `06-trips`, `07-completed`, `08-receipt`, `09-live`, `10-error`, `19-awaiting`, `20-empty`, `21-home-empty`, `22-loading`, `23-cancel-dialog`, `25-rated`.
- 390: `11-home`, `12-book-pickup`, `13-book-type`, `14-book-patient`, `15-book-review`, `16-trips`, `17-completed`, `18-live`.

`C:\Users\itdev\AppData\Local\Temp\opencode\amb-shots\polish\`
- 1280: `01-pickup-route-1280`, `02-type-1280`, `03-patient-1280`, `04-review-1280`, `05-awaiting-1280`, `06-after-cancel-1280`.
- 390: `11-pickup-route-390`, `12-type-390`, `13-review-390`, `14-completed-390`.

## Known problems / gaps
- A typed destination without a hospital pin (or a saved address with no latitude/longitude) cannot be routed, so the card and Review keep "driving distance is not available yet". Selecting a saved address with a pin or a hospital search hit gives the real km, minutes and fare.
- PTA and ALS cannot be booked: no Vizito rate exists for them, so they render disabled with the server's reason.
- Event standby has no patient API; it opens a support dialog instead of a booking flow.
- Design screen 2 shows pickup, drop and vehicle type on one page; ours keeps type as step 2 of a 4-step stepper for the existing form flow.
- No "Edit" action on an already-created scheduled request (API has no edit endpoint); cancel and rebook instead.
- The 108 strip is on the home screen only, not repeated inside the wizard (wizard shows a single-line emergency reminder).
- Route estimate and fare are estimates; the final fare is only known after the trip. The estimate excludes waiting, night charge, tolls and parking.
