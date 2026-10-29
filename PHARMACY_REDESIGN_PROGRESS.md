# Pharmacy v2 redesign — progress

Status: **complete (UI + live end-to-end walk on real data)**  
Date: 29 Oct 2026  
App: `http://localhost:5174` · API: `http://localhost:3000`

The v2 pharmacy experience replaces the UI behind the **existing** `/pharmacy-orders` routes. No routes, booking journeys or backend contracts were duplicated.

## Designs implemented

| Design | Screen | Route |
| --- | --- | --- |
| `pharmacy-v2-1-home-search.png` | Pharmacy home + search + cart sidebar | `/pharmacy-orders/new` |
| `pharmacy-v2-3-medicine.png` | Medicine detail + nearby pharmacies | `/pharmacy-orders/new?medicine=:id` |
| `pharmacy-v2-4-cart.png` | Cart, prescription request, delivery options, payment | `/pharmacy-orders/new?view=cart` |
| `pharmacy-v2-5-order.png` | Order detail, timeline, partner/code, bill, actions | `/pharmacy-orders/:id` |
| `pharmacy-v2-6-orders.png` | My pharmacy orders tabs, table, requests | `/pharmacy-orders` |

Sidebar now highlights **Pharmacy** on every `/pharmacy-orders*` route (previously the shared navigation treated it as Bookings).

## What changed

- **Home/search** — location-aware hero, real medicine search (`GET /medicines/near`), nearby pharmacy directory, compact “Popular near you” grid (4 items), live cart summary, recent orders.
- **Medicine** — one medicine image, real MRP, strength/pack/manufacturer/composition, quantity, “Add to cart”, prescription badge, `GET /medicines/:id/pharmacies-near`, delivery/pickup + stock + distance, same MRP at every pharmacy.
- **Cart** — pharmacy header, line items, quantity/remove, prescription review (Vizito prescription or upload), inline request/quote polling, delivery vs store pickup, saved/manual address, server delivery fee (`GET /orders/delivery-options/:pharmacyId?pincode=`), payment choice, disabled “Awaiting pharmacist quote” state until a quote exists.
- **Order detail** — status chips, 6-step timeline (Rx orders include “Quote ready”), delivery partner + Call + ETA + 4-digit code, or store pickup address + pickup code, item list, bill (items + API delivery fee), invoice download, Order again, cancellation panel, rating/help.
- **Orders list** — tab counts from `GET /orders/mine/counts`, search, real date-range dropdown, responsive order cards on mobile, prescription-request preview.
- **Payments** — existing Razorpay `PaymentDialog`/`payOnline` flow retained; test-mode card payment verified.
- **Prescription requests** — existing `?tab=requests` and quote/accept request flow preserved, extracted to `PrescriptionRequestsScreen.tsx`.

## Files

Inside `src/presentation/modules/pharmacy/`:

- `PharmacyV2.tsx`, `PharmacyOrdersV2.tsx`, `PharmacyOrderDetailV2.tsx`
- `PharmacyV2.css`, `pharmacyV2Ui.ts`, `PharmacyPaymentDialog.tsx`, `pharmacyInvoice.ts`
- `PrescriptionRequestsScreen.tsx`
- Existing entry points now re-export v2: `OrderBuilderScreen.tsx`, `PharmacyOrdersScreen.tsx` (also keeps `EmptyState`), `OrderDetailScreen.tsx` (named helpers/tests untouched).

Service layer:

- `src/services/pharmacyOrderHelper.ts` — `searchMedicinesNearApi`, `getMedicinePharmaciesNearApi`, `getDeliveryOptionsApi`, `getMyOrderCountsApi`, `getMyOrdersGroupedPageApi`, `PatientOrderV2` delivery fields and delivery-aware order inputs.

One shared navigation exception:

- `src/presentation/components/Sidebar.tsx` — one-line destination mapping so `/pharmacy-orders*` selects the Pharmacy item. No other navigation behaviour changed.

## Backend rules respected

- Search only real nearby catalogue (`GET /medicines/near`), no invented medicines/prices.
- Delivery fee and total come from the server order / delivery-options API; the client only mirrors `free_above` for the pre-order estimate. Sri Sai returns `fee: 30`, `free_above: 500`, pickup enabled.
- DELIVERY orders send `delivery_address_text` + `delivery_pincode`.
- Pickup orders send `fulfillment_type: PICKUP` and use `pickup_code`.
- Prescription-required medicines cannot be ordered until pharmacy acceptance + quote; the order is created with `pharmacy_request_id`.
- Tab counts come from the API.
- No pharmacy name inside item rows, one medicine image, no pack-size/time-slot pickers or live map.

## Live walk (real data, Sri Sai Medicals)

Pharmacy `36235041-da8b-4c9c-93a6-004bdb6fb480` · PIN `500084` · Kavya `8866314762`.

### 1. Home-delivery prescription order — paid online

| Step | Result |
| --- | --- |
| Search → medicine → nearby pharmacy → cart | Paracetamol 500 mg, Sri Sai, ₹15 |
| Send prescription request | `9807ca1f-c73f-4536-aecc-3d9c3ca26648` |
| Pharmacy accept + quote | ₹15 quote, valid 24 h |
| Delivery option | Home delivery, ₹30 fee, total ₹45 |
| Razorpay test card | `5267318187975449`, `12/30`, CVV `123`, OTP `123456` → **Payment Successful ₹45** |
| Order created | `c742aed4-00fb-47dc-900f-2dfe98cc8904`, invoice `INV-000007` |
| Pharmacy claim → checkout → dispatch | `Ramesh Kumar`, `9876501234`, ETA ~45 min |
| Patient view | Partner, Call, ETA and delivery code **8024** |
| Complete with code | Order **Delivered**, timeline complete, ₹45 paid |

### 2. Store-pickup order — cash, collected

| Step | Result |
| --- | --- |
| Cart | Azithromycin 500 mg, Sri Sai, store pickup, pay on pickup, ₹120 |
| Request | `62deca2a-9920-4641-ad58-fdb523cba7c7` |
| Pharmacy quote | ₹120 |
| Order created | `b16569b9-0f4c-47cf-85b1-65904a86bb7f`, `CASH` / `PICKUP` / `CREATED` |
| Pharmacy claim → checkout | `READY_FOR_PICKUP`, pickup code **3704** |
| Patient view | “Ready now”, pickup code, store address, Call |
| Complete with code | **Collected**, payment `PAID` |

### 3. Store-pickup order — cancelled by pharmacy

| Step | Result |
| --- | --- |
| Request / quote | `9866e5f2-7af1-4d05-883d-27acada58d07`, ₹120 |
| Order created | `abd9c4ae-3a9f-47a8-88f9-ca390c51eb0d`, `CASH` / `PICKUP` / `CREATED` |
| Pharmacy cancel | Reason “Medicine was out of stock at pickup”, status `CANCELLED` |
| Patient view | “The pharmacy cancelled this order.” + reason, no stale success banner, pickup card says **Cancelled**, no pickup code promised |

Notes:

- All 13 Sri Sai catalogue medicines currently require a prescription, so the live walk used the request → accept/quote → order path. Direct OTC checkout remains implemented for future non-Rx medicines.
- Cancelling from `READY_FOR_PICKUP` is intentionally blocked by the backend (“Cancel the resulting sale instead”); the cancel walk therefore used an order before claim.

## Screenshots

`vizito-patient-web/screenshots/pharmacy-v2/` — desktop `1280×1000`, mobile `390×844`.

- `01-home-1280` … `09-order-paid-1280` — first design pass and paid delivery order.
- `20-orders-1280|390` — final orders list, tabs/counts, search, date menu.
- `21-detail-dispatched-1280|390` — partner + ETA + code before delivery.
- `21-pickup-collected-1280|390` — collected pickup order.
- `22-home-1280|390`, `23-search-1280|390`, `24-medicine-1280|390`, `25-cart-1280|390` — final responsive screens.
- `26-detail-delivered-1280|390` — delivered order.
- `27-pickup-request-sent-1280` — pickup request sent.
- `28-pickup-placed-1280` — pickup order placed.
- `29-pickup-ready-1280` — ready for pickup with code 3704.
- `30-pickup-cancelled-1280|390` — cancelled pickup copy.

All final captures were taken with fresh patient auth; no 401 screens. No horizontal overflow at either width. Sidebar shows Pharmacy on every captured pharmacy route.

## Verification

- `npx tsc -b` — **clean**.
- `npm test` — **193 passed, 2 failed**:
  - `BasketDrawer.test.tsx` — now 5/5 passing. Drawer tests render the open state (matching the component, which intentionally returns `null` when closed), assert the closed state renders nothing, and mock `VizitoDialog`'s body portal so the record markup can be inspected server-side. All original open-state assertions are unchanged.
  - 2 × `LabReview.test.tsx` — pre-existing/unrelated (labs module untouched by this work).
- Pharmacy screens have no console/page errors in the final captures.
- No server restarts and no commits were made.

## Fixed during final QA

- Sidebar now selects Pharmacy instead of Bookings.
- Delivery detail no longer repeats the PIN (`…, 500084, 500084`).
- Popular header links to medicines, not orders.
- Orders date range is a normal dropdown (was an always-open 4-card radio block).
- Orders table no longer wraps pharmacy name/area into 3 lines; removed noisy rating suffix.
- Medicine page no longer repeats the medicine name (single `h1`).
- Cart place-order button is clearly disabled and labelled “Awaiting pharmacist quote” until the quote is ready.
- Mobile cart header/rows re-laid out (no squeezed pharmacy column or duplicated unit price).
- Cancelled orders no longer show the green “order is placed” banner or “Being prepared” pickup state.
