# Home care, pharmacy, ambulance, blood — backend for the v2 designs (built 2026-10-28, Claude)

Designs: D:\Vizito-latest6\design\homecare-v2-*, pharmacy-v2-*, ambulance-v2-1to5, bloodbank-v2-*.
Rule: real data only; when a field is null/empty, hide that element (never show mockup values).

## Home care
- `GET /home-care/catalogue?pincode=500084&lat=&lng=&category=` → services, each with `agency { id, name, logo_url, on_vizito_since, vizito_verified, rating, ratings, hours, distance_km }`, `professionals` (verified staff count), `team { available_genders, languages, qualifications, police_verified }`, `earliest_start {date,time}`, `avg_experience`, `price`, `duration_minutes`.
- "Packages" screen: group services by category + duration across agencies and show the lowest real price as "from ₹X".
- Agency distance needs the agency's office pin; null today for CareFirst (no address saved) → hide.
- No live map for the professional: "Track professional" opens the visit status (assigned → on the way → arrived → done).
- Payment: payOnline (already wired in HomeCareJourney/Agency/Quote).

## Pharmacy (home delivery is NEW)
- Search across nearby pharmacies: `GET /medicines/near?keyword=&lat=&lng=&pincode=&radius_km=5|10|25&page=&page_size=10|20` → `items[{ id, medicine_name, strength…, mrp, requires_prescription, pharmacies_near, nearest{…}, home_delivery_available }]`, paging envelope.
- Medicine page "Available at pharmacies near you": `GET /medicines/:id/pharmacies-near?lat=&lng=&pincode=&radius_km=` → `items[{ pharmacy_id, name, phone, address, distance_km, logo_url, store_pickup, home_delivery, delivery_fee }]`. Price = medicine MRP (same at every pharmacy). Open now/hours: join `pharmacy_id` with the provider directory (`/patients/providers`).
- Checkout: `GET /orders/delivery-options/:pharmacyId?pincode=` → `{ available, reason, fee, free_above, hours, pickup:true }`. Create a delivery order with `fulfillment_type:'DELIVERY', delivery_address_text, delivery_pincode` (server checks the PIN and adds the fee; free above `free_above`). Show "The pharmacy will confirm the delivery time".
- Order details (patient `GET /orders/:id/mine`): `delivery_address_text, delivery_pincode, delivery_fee, delivery_person_name, delivery_person_phone, delivery_eta`, and `pickup_code` = the 4-digit handover code (shown while READY_FOR_PICKUP or OUT_FOR_DELIVERY). No live map.
- Pharmacy side (partner app, done): Pharmacy profile → "Home delivery" settings; order details → "Send with this delivery person" (name, mobile, expected time) and delivery code required to mark delivered.
- One pack per medicine (no pack-size picker). One image per medicine.
- Test pharmacy: Sri Sai Medicals (9000006001, id 36235041-…) has delivery ON: ₹30, free above ₹500, PINs 500081/500084/500032, 09:00–21:00.

## Ambulance
- Existing booking/tracking/receipt/pay-after-trip APIs. New: `POST /ambulance/trips/mine/:id/rate`, `my_rating`/`can_rate` on trips. Show the OPERATOR's rating (trip `operator.rating`), not the driver's.

## Blood
- List: `GET /bloodbank/stock-grid?component=&lat=&lng=&sort=nearest|most_stock|recently_updated` → centres with stock per group (units, `more` = 10+), hours, is_24x7, licence_number, distance_km, `photo_url`, `rating`, `rating_count`, `stock_updated_at`.
- Centre page: `GET /bloodbank/centres/:id?lat=&lng=` → centre + `components[{code,name,stock{group:{units,more,in_stock}}}]`, `charges[{component, amount}]`, `reservation_hours`.
- Type is always "Blood bank" (no Hospital/NGO filter). No "About" text stored → hide that section.
- Requests go to ONE centre. Replace "Send to nearby centres" with "Choose nearest centre with stock" (pick the nearest centre whose stock has the group+component).
- Payment: payOnline (wired in MyBloodRequestsScreen).
