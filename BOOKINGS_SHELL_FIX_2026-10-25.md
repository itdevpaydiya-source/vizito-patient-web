# Bookings shared-shell and typography correction — 25 October 2026

The reference images now govern page content only. The live app owns sidebar/header navigation and typography scale.

## Changes

1. `src/layouts/MainLayout.tsx`: removed the `bookings-layout` and `booking-reference-layout` route classes. Bookings, lab bookings and their details use the same unmodified shell sizing/padding/header as Home Care. The mobile header remains visible. Added an accessible name to the existing mobile navigation button.
2. `src/presentation/components/Sidebar.tsx`: removed booking-specific item insertion, hiding, renaming and reordering. One shared navigation tree now serves Dashboard, Home Care, Bookings, Labs and details. Standard active-route highlighting remains.
3. `src/presentation/modules/bookings/{BookingsReference,MyConsultationsScreen}.css` and `src/presentation/modules/labs/LabBookingsReference.css`: deleted selectors that styled the app shell. Page content retains reference card layouts, colours and icons. Restored the live text scale: 30px desktop / 24px mobile page titles, weight 900, 36px / 32px line height; section/provider headings 16px, body/actions 14px, small labels 12px. Retained doctor detail headings use the same title scale.
4. `src/presentation/modules/bookings/MyConsultationsScreen.tsx`: Equipment Rentals uses the shared `ProviderImage` generated equipment icon plus the actual rental business initials. A product's primary photo is no longer used as the business-logo image in this overview card. The fallback is verified against the real rental provider name.
5. `e2e/bookings-shell-consistency.spec.ts`: added the requested real-account navigation sequence at 1280 and 390, plus retained doctor details. Compares sidebar item order/text/hrefs/styles/dimensions, header style/height and main shell padding on every screen. Compares booking/lab title family, size, weight and line height with Home Care. Asserts body/section sizes, equipment icon/initials and no horizontal main-content overflow.

## Screenshots

[Full screenshot gallery: desktop and mobile](artifacts/bookings-shell-fix/index.html).

| Screen | 1280 | 390 |
| --- | --- | --- |
| Dashboard | [View](artifacts/bookings-shell-fix/dashboard-1280.png) | [View](artifacts/bookings-shell-fix/dashboard-390.png) |
| Home Care | [View](artifacts/bookings-shell-fix/home-care-1280.png) | [View](artifacts/bookings-shell-fix/home-care-390.png) |
| Bookings | [View](artifacts/bookings-shell-fix/bookings-1280.png) | [View](artifacts/bookings-shell-fix/bookings-390.png) |
| Lab Tests / lab bookings | [View](artifacts/bookings-shell-fix/lab-bookings-1280.png) | [View](artifacts/bookings-shell-fix/lab-bookings-390.png) |
| Lab booking details | [View](artifacts/bookings-shell-fix/lab-details-1280.png) | [View](artifacts/bookings-shell-fix/lab-details-390.png) |
| Retained doctor details | [View](artifacts/bookings-shell-fix/doctor-details-1280.png) | [View](artifacts/bookings-shell-fix/doctor-details-390.png) |
| Equipment fallback | [View](artifacts/bookings-shell-fix/equipment-card-1280.png) | [View](artifacts/bookings-shell-fix/equipment-card-390.png) |

The gallery includes open-sidebar captures on mobile for the five requested screens. Doctor details are a modal and intentionally keep the underlying shell inert. Dashboard retains its existing shared-header rule of omitting Back; other routes show Back. No new route-specific shell was introduced.

## Measured results

[Raw computed metrics](artifacts/bookings-shell-fix/metrics.json).

| Width | Screen | Sidebar width | Header height | Page title | Weight |
| --- | --- | --- | --- | --- | --- |
| 1280 | dashboard | 256px | 64px | 30px | 900 |
| 1280 | home-care | 256px | 64px | 30px | 900 |
| 1280 | bookings | 256px | 64px | 30px | 900 |
| 1280 | lab-bookings | 256px | 64px | 30px | 900 |
| 1280 | lab-details | 256px | 64px | 30px | 900 |
| 390 | dashboard | 256px | 64px | 24px | 900 |
| 390 | home-care | 256px | 64px | 24px | 900 |
| 390 | bookings | 256px | 64px | 24px | 900 |
| 390 | lab-bookings | 256px | 64px | 24px | 900 |
| 390 | lab-details | 256px | 64px | 24px | 900 |

The sidebar is offscreen until opened on mobile, as on Home Care. It remains the same 256px component. The header is 64px at both widths. Navigation text styles and item order compare equal across every tested route.

## Verification

- `npx tsc -p tsconfig.app.json`: passed.
- `npx playwright test e2e/bookings-shell-consistency.spec.ts --workers=1 --output=artifacts/bookings-shell-final-results --reporter=list`: **1 passed (35.6s)** on the final shell/typography/fallback implementation, including the added doctor details captures.
- `e2e/lab-bookings-ui.spec.ts`: **4 passed** in the regression run: real list/details/actions/payments/documents, loading/empty/error/retry/not-found, multiple payments/released reports and trends.
- The initial consistency run caught the remaining 22px lab-detail heading; it was corrected before the successful rerun. Extending the capture to the legacy responsive doctor screen also required selecting its visible title rather than both desktop/mobile title elements; assertions on shell equality were retained.
- `git diff --check` for shared layout/sidebar changes: clean.

REA: consistent named controls and programmatic navigation states follow [WCAG 2.2 SC 4.1.2](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html); actual-name image alternatives follow [SC 1.1.1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html). Page geometry/colours follow the supplied references; shell and type sizes follow the live app as instructed.

No backend source edits, mock response data, commits, pushes or deployment.
