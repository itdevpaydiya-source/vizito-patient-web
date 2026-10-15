# Blood Bank — merge notes (feature/blood-bank)

Prepared by Ravi for review and merge into `dev`. Every repository's `feature/blood-bank` branch was created fresh from `origin/dev` (2026-10-15). It contains only Blood Bank work, plus the minimal shared lines it needs (section c). Lab, home-visit, partner booking-pause, notification-security and other non–Blood Bank changes from my local copy are **not** included; the main developer has newer versions of those. Ambulance is **not** included (section l). The same notes are committed at the root of every changed repository.

## a) Branches

| Repository | Branch | Last code commit |
|---|---|---|
| vizito-auth | feature/blood-bank | `e1857eb` |
| vizito-booking | feature/blood-bank | `8fe0752` |
| vizito-catalogue | feature/blood-bank | `515cdc3` |
| vizito-server (gateway) | feature/blood-bank | `8682e3a` |
| vizito-partner | feature/blood-bank | `9a8a2d3` |
| vizito-patient-web | feature/blood-bank | `cef0cf2` |

This notes file is one more commit on top of each branch. A patch set of every branch (`git format-patch origin/dev..feature/blood-bank`) is kept on Ravi's machine in `bloodbank-patches/<repo>/` next to the project folder.

Not in scope: the Ops web app (`vizito-ops-web`) has no repository in this copy and is left out completely. Ops actions are reachable through the API routes listed in (d).

## b) Migrations (all ≥ 1795000000000)

| Service | File | What it does | Existing data? | down() |
|---|---|---|---|---|
| auth | `1795000000000-BloodBankLicences` | creates `bloodbank_licences` | no | drops the table |
| auth | `1795000000400-BloodBankLicenceDocuments` | creates `bloodbank_licence_documents` (metadata + private storage key; files live outside the DB) | no | drops the table |
| auth | `1795000000800-BloodBankHospitalLink` | adds the hospital-link column to `bloodbank_licences` | no (new table) | drops the column |
| auth | `1795000000900-PartnerBankVerification` | adds `verified_by`, `verified_at`, `review_note` (all NULL) to the **shared** `partner_bank_accounts` | adds nullable columns only; no rows changed | drops the 3 columns |
| booking | `1795000000200-BloodBankD1` | creates `blood_units`, `bloodbank_events`, `bloodbank_settings` | no | drops them |
| booking | `1795000000500-BloodBankD2` | creates `blood_requisitions`, `blood_requests`, `blood_crossmatches`, `bloodbank_charges`; adds reservation/issue columns to `blood_units` and a column to `bloodbank_settings` (Blood Bank tables) | no | drops tables and columns |
| booking | `1795000000600-BloodBankChargeCurrency` | adds a charge-currency column to `blood_requests` and `bloodbank_charges`; sets `'INR'` on existing **Blood Bank** requests that have a charge | updates Blood Bank rows only | drops the columns |
| booking | `1795000000700-BloodBankD3Donors` | creates `blood_donors`, `blood_donation_sessions`, `blood_donor_appointments`, `blood_donor_screenings`, `blood_donations`, `blood_donation_results` | no | drops them |
| booking | `1795000000900-BloodBankD4` | creates `bloodbank_stock_minimums`; adds `routed_bloodbank_partner_id` to `blood_requisitions` | no | drops them |
| booking | `1795000001000-BloodBankHardening` | index `idx_bb_events_request` on `bloodbank_events` (only if missing) | no | drops the index |
| booking | `1795000001100-BloodBankGuidanceAndCaps` | creates `bloodbank_screening_guidance`, `bloodbank_charge_caps` | no | drops them |
| booking | `1795000001200-CommissionRates` | creates `commission_rates` (per business type; no rows inserted) | no | drops the table |
| catalogue | `1795000000100-BloodReference` | creates `blood_components`, `blood_groups` and seeds them (`INSERT IGNORE`, see f) | no | drops them |

down() was reviewed in code for each file (each reverses its up()); it has **not** been executed for this push. No migration has been run on any server or database for this push.

## c) Changes outside the Blood Bank module

Each shared change is listed below as an exact diff against `origin/dev`, so it can be re-applied by hand on newer code. In summary:

| Area | File | Why |
|---|---|---|
| **auth / login / roles** | `auth/auth.service.ts`, `auth/dto/register.dto.ts`, `auth/dto/complete-provider-profile.dto.ts`, `roles/roles.service.ts`, `partners/partners.service.ts` (registration mapping) | a business can sign up as `bloodbank` (name + registration number); `bloodbank` role seeded |
| **auth / staff permissions** | `partners/staff.service.ts`, `partners/staff.controller.ts` (+ new `partners/bloodbank-staff.permissions.ts`) | a staff member can only grant Blood Bank permissions they hold; donor-results access is owner-only |
| **payouts / bank** | `partners/entities/partner-bank-account.entity.ts`, `partners/partner-review.service.ts`, `partners/partners.controller.ts`, `partners/partners.service.ts` (bank save), migration 0900 | PF-03: a blood bank's payout account must be verified; any change resets it. New Ops verify/reject + queue routes; internal `payable` check (**gates blood banks only**: every other type gets `payable: true`); internal partner-type lookup for commission |
| **auth helper (new file)** | `partners/auto-approval.ts` | the `AUTO_APPROVE_PARTNER_VERIFICATIONS` switch (default on) used by licence review and bank verification |
| **booking app module** | `app.module.ts` | registers `BloodBankModule`, `CommissionModule` |
| **payments / ledger** | `payments/payments.service.ts` | `recordChargedTransaction(…, feeRate?)`: optional fee rate so a Blood Bank processing charge uses its Ops-set commission; omitted = existing 15% for everyone else |
| **payouts** | `transactions/ops-payouts.service.ts` | before Ops starts / marks a payout paid, ask auth if the payee is payable (only blood banks can be refused) |
| **commission (new module)** | `commission/*`, migration 1200 | per-business-type commission; only `bloodbank` is read today |
| **notifications** | `notifications/notifications.service.ts` | `notifyOne` accepts `recipient_type: 'bloodbank'` (varchar column; no DB change) |
| **shared guard** | `common/guards/staff-permissions.guard.ts` | alias `bloodbank.donor_read` → `donor` / `donor_results` (the results officer can open the donor desk) |
| **catalogue app module** | `app.module.ts` | registers `BloodReferenceModule` |
| **gateway proxy route list** | `proxy/proxy.service.ts` | `bloodbank` and `commission` → booking service |
| **partner app: routing / sidebar / roles** | `navigation/AppNavigator.tsx`, `SidebarEngine.tsx`, `RoleContext.tsx`, `AuthModule.tsx`, `UserTypeSelection.tsx`, `MainLayout.tsx`, `authHelper.ts` | Blood Bank routes (behind a permission gate), sidebar items, `bloodbank` role (provider type id 11) |
| **partner app: sign-up** | `components/RegistrationModule.tsx` | blood bank sign-up card, fields, validation, payload |
| **partner app: notifications** | `notifications/NotificationsScreen.tsx` | 3 Blood Bank categories open the right screen |
| **partner app: doctor consultation** | `appointments/ConsultationWorkspace.tsx` | "Blood requisition" button (doctor → blood bank) |
| **partner app: helpers (new)** | `data/utils/inputFilters.ts`, `e2e/helpers/localDb.ts` | input helper used by Blood Bank screens; test-only local DB helper |
| **patient app: routing / sidebar / tiles** | `navigation/AppNavigator.tsx`, `components/Sidebar.tsx`, `config/serviceTypes.ts`, `layouts/MainLayout.tsx`, `dashboard/PatientDashboard.tsx`, `services/HealthcareServicesScreen.tsx`, `booking/UniversalBookingScreen.tsx` | Find Blood tile, 4 routes, 2 sidebar links, `bloodbank` service opens `/find-blood` |
| **patient app: notifications** | `notifications/NotificationsScreen.tsx` | 2 Blood Bank notification links |

Not touched: bookings code (Blood Bank only calls the existing `bookings.create`, using `booking_type 'BLOODBANK'` in the existing varchar column), refunds code, the gateway auth, shared validators, shared entities other than `partner_bank_accounts`.

## d) New API routes

Through the gateway, `/bloodbank/*` and `/commission/*` go to booking, `/partners/*` to auth.
- "Patient" = patient login.
- "Doctor" = doctor login.
- "Centre" = blood bank owner, or staff with the named Blood Bank permission.
- "Ops" = Vizito Ops (admin / superadmin).
- "Internal" = service-to-service (`system` role) only.

| Method + path | Who |
|---|---|
| `GET /bloodbank/reference`, `GET /bloodbank/availability` | signed-in users |
| `POST /bloodbank/requisitions/upload`, `GET /bloodbank/requisitions/mine` | Patient |
| `POST /bloodbank/requests`, `GET /bloodbank/requests/mine`, `GET /bloodbank/requests/mine/:id`, `POST /bloodbank/requests/mine/:id/cancel`, `POST /bloodbank/requests/mine/:id/pay` | Patient (own requests) |
| `POST /bloodbank/requisitions/doctor`, `GET /bloodbank/requisitions/doctor` | Doctor |
| `GET/PUT /bloodbank/centre/charges`; `GET /bloodbank/centre/requests`, `GET …/requests/:id`, `…/:id/issue-slip`, `…/:id/documents/requisition/file`; `POST …/:id/accept`, `/reject`, `/cancel`, `/sample`, `/crossmatch`, `/extend-reservation`, `/cash`, `/issue` | Centre |
| `GET /bloodbank/stock/summary`, `/units`, `/units/:id`, `/units/:id/label`, `/events`; `POST /bloodbank/stock/units`, `/units/:id/release`, `/discard`, `/recall`; `GET/PUT /bloodbank/stock/settings` | Centre (release / discard / recall need those permissions) |
| `GET/PUT /bloodbank/insights/minimums`, `GET /bloodbank/insights/units/:id/needed-elsewhere`, `/finance`, `/report` | Centre (finance: owner or Finance permission) |
| `GET /bloodbank/donor/me`, `POST /bloodbank/donor/register`, `GET /bloodbank/donor/sessions`, `POST /bloodbank/donor/appointments`, `POST …/appointments/:id/cancel`, `GET …/donations/:id/certificate` | Patient (as donor) |
| `GET/POST /bloodbank/centre/donors/sessions`, `POST …/sessions/:id/close`, `/cancel`, `GET …/sessions/:id/appointments`, `POST …/appointments/:id/checkin`, `/screen`, `/collect`, `/no-show`, `/guidance-check`, `GET …/appointments/:id/screenings`, `GET/PUT …/guidance`, `GET …/donations`, `GET/POST …/donations/:id/results` | Centre (results: donor-results permission) |
| `GET/PUT /bloodbank/ops/commission`, `POST /bloodbank/ops/payouts/run-weekly`, `GET/PUT /bloodbank/ops/charge-caps` | Ops |
| `GET /commission/ops`, `PUT /commission/ops/:type` | Ops |
| `GET/PUT /partners/bloodbank/licence/me`, `POST …/licence/me/submit`, `POST …/licence/me/document`, `GET …/licence/me/documents/:docId/file` | blood bank owner |
| `GET /partners/bloodbank/ops/:partnerId/licence`, `…/licence/documents`, `…/documents/:docId/file`, `POST …/licence/review` | Ops |
| `GET /partners/ops/bank-accounts`, `POST /partners/ops/:id/bank/review` | Ops |
| `GET /partners/bloodbank/internal/discoverable`, `…/internal/by-hospital/:hospitalId`, `…/internal/:partnerId/status`, `GET /partners/bank/internal/:id/payable`, `GET /partners/internal/:id/type` | Internal |
| (catalogue) `GET /blood-reference` | Internal (booking → catalogue) |

## e) Environment variables, packages, scripts, seeds

- **Environment:** `AUTO_APPROVE_PARTNER_VERIFICATIONS` (auth). Default `true`: a submitted licence and a complete bank account are verified automatically, and recorded as "Auto-approved (no Ops review)". Set `false` to require Ops review. Everything else uses existing variables (`AUTH_SERVICE_URL` / `AUTH_MICROSERVICE_URL`, `BOOKINGS_MICROSERVICE_URL`, `CATALOGUE_*`, `GATEWAY_INTERNAL_SECRET`).
- **Packages:** none added in any repository.
- **Scripts:** none.
- **Seeds:** only the catalogue reference data in migration `1795000000100` (see f).

## f) Master data

- **Blood components:** Whole blood, Packed red blood cells (PRBC), Platelets, Fresh frozen plasma (FFP), Cryoprecipitate.
- **Blood groups:** A±, B±, AB±, O±.
- These are standard identifiers and names only. Storage temperature and shelf life are deliberately left NULL until clinically approved (open decision OD-06), so no clinical value is invented.
- Screening guidance values (e.g. minimum weight / Hb / donation interval) are entered by each centre and produce **warnings only** (OD-13).
- Processing-charge caps are set by Ops. No fake or demo data is shown to users.

## g) Money

- **Blood is never sold.** A centre may set a **processing charge** per component (`bloodbank_charges`), capped by Ops (`bloodbank_charge_caps`). The amount is snapshotted on each request.
- **Online payment:** the existing payments service charges the patient, an existing `bookings` row is created (`booking_type 'BLOODBANK'`, PAID / CONFIRMED), and the existing `transactions` ledger line is written with the Blood Bank commission (`commission_rates`, Ops-set; default 15%). If the ledger write fails after the charge succeeded, the request is marked for support and never charged twice.
- **Cash:** recorded by the centre (`/requests/:id/cash`).
- **Refunds:** on cancellation, an online payment is refunded through the existing payment path. If the ledger line is missing or already paid out, it goes to support (`refundDecision`) and is never silently skipped.
- **Payouts:** weekly, through the existing settlement / payout tables (`bloodbank-payouts.service`, Ops `run-weekly`). Money is sent only to a **verified** bank account (PF-03, section c).

## h) Clinical safety rules implemented

- **Unit lifecycle:** QUARANTINED → AVAILABLE → RESERVED → ISSUED, or DISCARDED / RECALLED / EXPIRED.
  - Release needs an unexpired unit.
  - Expiry is applied by the system; quarantined units can only be discarded.
  - Every change is logged (`bloodbank_events`).
- **Matching:** **exact ABO/Rh group and component only** until an approved compatibility matrix exists (OD-10).
  - The sample's lab group must be recorded and equal the requested group.
  - Cross-match results are append-only (COMPATIBLE / INCOMPATIBLE / INCONCLUSIVE).
- **Donations:**
  - A unit made from a donation can be released only when the current test result is NON_REACTIVE (D3-2, pending owner confirmation).
  - Results are corrected by superseding, never by editing.
  - Results are visible only with donor-results permission (owner-only to grant).
- **Who can issue:** owner, or staff with the matching Blood Bank permission (release, discard / recall, issue, donor, donor results, finance, settings). Staff cannot grant permissions they do not hold.
- **Limits:**
  - at most 10 units per request;
  - requests are checked against available stock minus outstanding demand;
  - reservations expire and can be extended.

## i) Tests (real results, 2026-10-15, on the feature/blood-bank branches)

| Repository | Command | Result |
|---|---|---|
| vizito-auth | `npx jest src/bloodbank src/partners/bloodbank-staff` | `Tests: 21 passed, 21 total` |
| vizito-auth | `npx jest` (full) | `Tests: 1 failed, 23 passed, 24 total`. `origin/dev` alone: `1 failed, 2 passed, 3 total` (the same failure exists before this work) |
| vizito-booking | `npx jest src/bloodbank` | `Tests: 54 passed, 54 total` |
| vizito-booking | `npx jest` (full) | `Tests: 22 failed, 112 passed, 134 total`. `origin/dev` alone: `22 failed, 58 passed, 80 total` (all 22 pre-existing) |
| vizito-catalogue | `npx jest` (full) | `Tests: 11 failed, 149 passed, 160 total`, identical to `origin/dev` (no Blood Bank unit tests) |
| vizito-server | `npx jest` | `Test Suites: 2 failed, 2 total; Tests: 0 total`, identical to `origin/dev` |
| vizito-partner | `npx vitest run src/presentation/modules/bloodbank` | `Tests 2 passed (2)` |
| all backends | `npx tsc --noEmit -p tsconfig.json` | 0 errors, except vizito-booking's 2 pre-existing spec errors (`bookings/role-isolation.spec.ts`, `bookings/walkin-verification.spec.ts`), also on `origin/dev` |
| partner, patient | `npx tsc --noEmit -p tsconfig.app.json` | 0 errors |

**Playwright e2e** (21 `bloodbank-*.spec.ts` files in the partner repo) were **not run for this push.** They write to a real database, and this push must not change the DEV database. Run them on a test stack after merging.

## j) Known gaps in Blood Bank

- **Clinical decisions still open:**
  - compatibility matrix (OD-10, exact match only for now);
  - storage temperature / shelf life per component (OD-06);
  - release rule for donated units (D3-2);
  - registration-number format (OD-18, presence only);
  - donor consent text (`v0-pending-legal-review`).
- **Sign-up:** the duplicate registration-number check from my copy was not brought over. It is part of the main developer's sign-up work.
- **Ops web app:** the Ops screens (licence review, bank verification, commission, charge caps) are not in this push; the routes exist.
- **Commit split:** in vizito-auth, the "sign-up / role / staff" commit also carries the bank-save part of `partners.service.ts`, which belongs with the bank-verification commit. The branch content is correct.

## k) Conflicts resolved in step 2

None. Instead of merging `origin/dev` into the old local branch, each `feature/blood-bank` was created fresh from `origin/dev` and only Blood Bank changes were re-applied, as agreed. `origin/main` was ignored (unrelated old scaffold).

## l) Ambulance status

**Not pushed.** `feature/ambulance` is blocked by a dependency question (see the final report): the Ambulance code imports Blood Bank code, so it cannot be built from `origin/dev` alone.
- booking `ambulance/*` uses `bloodbank/bloodbank-payouts.service`;
- auth `ambulance/*` uses `bloodbank/bloodbank-licence.entity` and `.rules`.

**What works end to end (DEV only, behind switches that are OFF):**
- operator licence, fleet and crew;
- scheduled and urgent bookings;
- driver dispatch with search rounds, reassignment and fare cap;
- scheduled dispatch;
- pickup map pin (public OpenStreetMap);
- patient live tracking;
- durable notifications and desktop web push;
- cash and online payment (simulated provider).

**Missing / unfinished:**
- real payment provider (callbacks BLOCKED);
- paid maps / routing;
- masked calling;
- mobile apps;
- the owner exception actions (proposal only);
- Ops exception screens;
- reports;
- clinical BLS/ALS sign-off.

**Ambulance shared-file changes** (gateway `ambulance` route; bookings / payments / notification outbox and web-push; sidebar / routes; patient tiles): **none of them are in feature/blood-bank.** The branch was checked: no Ambulance file, route, sidebar item or migration (1796000000000–1796000001400). The only "ambulance" words in its diff are on existing lines where `bloodbank` was appended.

---

## Shared-file changes: exact diffs against origin/dev

#### vizito-auth — `src/app.module.ts`

```diff
@@ -14,4 +14,5 @@ import { PatientAuthModule } from './patient/patient-auth.module';
 import { HealthModule } from './health/health.module';
 import { SupportModule } from './support/support.module';
+import { BloodBankModule } from './bloodbank/bloodbank.module';
 
 @Module({
@@ -46,4 +47,5 @@ import { SupportModule } from './support/support.module';
     HealthModule,
     SupportModule,
+    BloodBankModule, // Blood Bank: licence verification, hospital link, internal status
     AuthModule,
     UsersModule,
```

#### vizito-auth — `src/auth/auth.service.ts`

```diff
@@ -46,4 +46,5 @@ export class AuthService {
     'ambulance',
     'equipment',
+    'bloodbank',
   ];
 
@@ -435,5 +436,5 @@ export class AuthService {
 
   // Business types that can sign up today (portal + patient booking both work end to end).
-  private static readonly OPEN_FOR_SIGNUP = ['doctor', 'hospitaladmin', 'clinicowner', 'pharmacy'];
+  private static readonly OPEN_FOR_SIGNUP = ['doctor', 'hospitaladmin', 'clinicowner', 'pharmacy', 'bloodbank'];
 
   /**
@@ -475,4 +476,10 @@ export class AuthService {
         regNo(d.drugLicenseNo, 'Drug licence number');
         break;
+      case 'bloodbank':
+        orgName(d.organizationName, 'Blood bank name');
+        // Presence only: blood bank registration-number format rules are not confirmed yet (OD-18).
+        need(d.bloodBankRegNo, 'Blood bank registration number is required.');
+        if (String(d.bloodBankRegNo).trim().length > 60) throw new BadRequestException('Blood bank registration number is too long (60 characters max).');
+        break;
     }
   }
```

#### vizito-auth — `src/auth/dto/complete-provider-profile.dto.ts`

```diff
@@ -129,4 +129,10 @@ export class CompleteProviderProfileDto {
   organizationName?: string;
 
+  // Blood bank registration number (OD-18). Separate from the licence number; format rules are TBD
+  // until confirmed, so only presence is checked.
+  @IsOptional()
+  @IsString()
+  bloodBankRegNo?: string;
+
   // authorizedPersonName reused
 }
```

#### vizito-auth — `src/auth/dto/register.dto.ts`

```diff
@@ -149,4 +149,10 @@ export class RegisterDto {
   organizationName?: string;
 
+  // Blood bank registration number (OD-18). Separate from the licence number; format rules are TBD
+  // until confirmed, so only presence is checked.
+  @IsOptional()
+  @IsString()
+  bloodBankRegNo?: string;
+
   // authorizedPersonName reused
 }
\ No newline at end of file
```

#### vizito-auth — `src/partners/entities/partner-bank-account.entity.ts`

```diff
@@ -40,3 +40,13 @@ export class PartnerBankAccount {
   @Column({ default: false })
   is_primary: boolean;
+
+  // Payout account verification (Blood Bank PF-03, 2026-10-09). Any change to holder / number / IFSC resets it.
+  @Column({ type: 'varchar', length: 120, nullable: true })
+  verified_by: string | null;
+
+  @Column({ type: 'datetime', nullable: true })
+  verified_at: Date | null;
+
+  @Column({ type: 'varchar', length: 300, nullable: true })
+  review_note: string | null;
 }
```

#### vizito-auth — `src/partners/partner-review.service.ts`

```diff
@@ -174,13 +174,92 @@ export class PartnerReviewService {
     if (!p) throw new NotFoundException('Partner not found');
     const [bank, kyc] = await Promise.all([this.bank.findOne({ where: { partner_id: id } }), this.kyc.findOne({ where: { partner_id: id } })]);
+    const { payable, reason } = this.payableRule(p, bank, kyc);
     return {
       partner_status: p.status,
-      bank: bank ? { holder: bank.account_holder_name, bank: bank.bank_name, branch: bank.branch_name, account: bank.account_number, ifsc: bank.ifsc, upi: bank.upi_id || null } : null,
+      bank: bank ? { holder: bank.account_holder_name, bank: bank.bank_name, branch: bank.branch_name, account: bank.account_number, ifsc: bank.ifsc, upi: bank.upi_id || null,
+        verification_status: bank.verification_status || 'Pending', verified_by: bank.verified_by, verified_at: bank.verified_at, review_note: bank.review_note } : null,
       pan: kyc?.pan_number || null,
-      // Paying out needs a verified business with a bank account and PAN on file.
-      payable: !!bank?.account_number && !!bank?.ifsc && !!kyc?.pan_number && (p.status === PartnerStatus.APPROVED || p.status === PartnerStatus.ACTIVE),
+      payable,
+      not_payable_reason: reason,
     };
   }
 
+  /**
+   * Paying out needs an approved business with a bank account and PAN on file (unchanged). Blood banks (PF-03,
+   * owner-confirmed 2026-10-09) also need the bank account VERIFIED. Other business types keep the earlier rule.
+   */
+  private payableRule(p: Partner, bank: PartnerBankAccount | null, kyc: any): { payable: boolean; reason: string | null } {
+    if (!(p.status === PartnerStatus.APPROVED || p.status === PartnerStatus.ACTIVE)) return { payable: false, reason: 'The business is not approved.' };
+    if (!bank?.account_number || !bank?.ifsc) return { payable: false, reason: 'No bank account registered.' };
+    if (!kyc?.pan_number) return { payable: false, reason: 'No PAN on file.' };
+    if (String(p.partner_type).toLowerCase() === 'bloodbank' && bank.verification_status !== 'Verified') {
+      return { payable: false, reason: bank.verification_status === 'Rejected' ? 'Bank account not accepted by Vizito Ops.' : 'Bank account not verified by Vizito Ops yet.' };
+    }
+    return { payable: true, reason: null };
+  }
+
+  /** Internal (booking service, before a payout is started or paid). Gates Blood Bank payouts only (PF-03); other types unchanged. */
+  async payable(id: string) {
+    const p = await this.partners.findOne({ where: { id } });
+    if (!p) return { payable: false, reason: 'Partner not found.' };
+    if (String(p.partner_type).toLowerCase() !== 'bloodbank') return { payable: true, reason: null };
+    const [bank, kyc] = await Promise.all([this.bank.findOne({ where: { partner_id: id } }), this.kyc.findOne({ where: { partner_id: id } })]);
+    return this.payableRule(p, bank, kyc);
+  }
+
+  /** Internal (booking service): which commission applies to this business. */
+  async partnerType(id: string) {
+    const p = await this.partners.findOne({ where: { id } });
+    return { partner_type: p ? String(p.partner_type).toLowerCase() : null };
+  }
+
+  /** Ops: verify or reject a partner's payout bank account (reason required to reject; the partner sees it). */
+  async reviewBank(id: string, action: 'Verify' | 'Reject', note: string | undefined, reviewer: string) {
+    if (action !== 'Verify' && action !== 'Reject') throw new BadRequestException('Unknown bank account action.');
+    const why = String(note || '').trim();
+    if (action === 'Reject' && why.length < 10) throw new BadRequestException('Write the reason for the partner (at least 10 characters) — they will see it.');
+    const p = await this.partners.findOne({ where: { id } });
+    if (!p) throw new NotFoundException('Partner not found');
+    const bank = await this.bank.findOne({ where: { partner_id: id } });
+    if (!bank?.account_number || !bank?.ifsc || !bank?.account_holder_name) throw new BadRequestException('The partner has not entered a complete bank account yet.');
+    bank.verification_status = action === 'Verify' ? 'Verified' : 'Rejected';
+    bank.verified_by = reviewer.slice(0, 120);
+    bank.verified_at = new Date();
+    bank.review_note = action === 'Reject' ? why.slice(0, 300) : null;
+    await this.bank.save(bank);
+    await this.history.save(this.history.create({ partner_id: id, action: `BankAccount:${action}`, remarks: (why || null) as any, performed_by: reviewer.slice(0, 255) }));
+    const url = process.env.BOOKINGS_MICROSERVICE_URL || 'http://localhost:4402';
+    const [title, message] = action === 'Verify'
+      ? ['Bank account verified', 'Vizito has verified your bank account. Payouts will be sent to it.']
+      : ['Bank account not verified', `Vizito could not verify your bank account: ${why} Update the details in your bank account settings.`];
+    fetch(`${url}/notifications`, {
+      method: 'POST',
+      headers: { 'Content-Type': 'application/json', 'x-gateway-secret': process.env.GATEWAY_INTERNAL_SECRET || '', 'x-user': JSON.stringify({ sub: 'auth-service', roles: ['system'] }) },
+      body: JSON.stringify({ recipient_type: String(p.partner_type).toLowerCase() === 'bloodbank' ? 'bloodbank' : 'doctor', recipient_id: id, title, message, category: 'Payments', target_id: id }),
+    }).catch(() => undefined);
+    return this.payoutAccount(id);
+  }
+
+  /** Ops: partners of a type and the state of their payout bank account (missing first). */
+  async bankQueue(type?: string) {
+    const rows: any[] = await this.partners.manager.query(
+      `SELECT p.id, p.business_name, p.partner_type, p.status, b.account_number, b.ifsc, b.account_holder_name, b.verification_status, b.verified_by, b.verified_at, b.review_note,
+              k.pan_number
+         FROM partners p
+    LEFT JOIN partner_bank_accounts b ON b.partner_id = p.id
+    LEFT JOIN partner_kyc k ON k.partner_id = p.id
+        WHERE p.deleted_at IS NULL ${type ? 'AND p.partner_type = ?' : ''}
+        ORDER BY p.business_name LIMIT 500`, type ? [type] : []);
+    const mask = (a: string) => (a ? `••••${String(a).slice(-4)}` : null);
+    return rows.map((r) => {
+      const hasAccount = !!r.account_number && !!r.ifsc;
+      return {
+        partner_id: r.id, business_name: r.business_name, partner_type: r.partner_type, partner_status: r.status,
+        bank_state: !hasAccount ? 'Missing' : r.verification_status || 'Pending', account: mask(r.account_number), ifsc: r.ifsc || null, holder: r.account_holder_name || null,
+        has_pan: !!r.pan_number, verified_by: r.verified_by, verified_at: r.verified_at, review_note: r.review_note,
+      };
+    }).sort((a, b) => ['Missing', 'Pending', 'Rejected', 'Verified'].indexOf(a.bank_state) - ['Missing', 'Pending', 'Rejected', 'Verified'].indexOf(b.bank_state));
+  }
+
   async act(id: string, action: ReviewAction, reason: string | undefined, reviewer: string) {
     const p = await this.partners.findOne({ where: { id } });
```

#### vizito-auth — `src/partners/partners.controller.ts`

```diff
@@ -113,4 +113,32 @@ export class PartnersController {
   }
 
+  @Get('ops/bank-accounts')
+  @ApiOperation({ summary: 'Ops: partners and the state of their payout bank account (filter: type)' })
+  bankQueue(@Req() req: any, @Query('type') type?: string) {
+    this.assertAdmin(req);
+    return this.review.bankQueue(type);
+  }
+
+  @Post('ops/:id/bank/review')
+  @ApiOperation({ summary: 'Ops: verify or reject a partner payout bank account (Blood Bank PF-03)' })
+  reviewBank(@Req() req: any, @Param('id') id: string, @Body() body: { action: 'Verify' | 'Reject'; note?: string }) {
+    this.assertAdmin(req);
+    return this.review.reviewBank(id, body?.action, body?.note, String(req.user?.full_name || req.user?.email || 'Vizito Ops'));
+  }
+
+  @Get('internal/:id/type')
+  @ApiOperation({ summary: 'Internal (booking): business type of a partner, for its commission (Blood Bank PF-03)' })
+  partnerType(@Req() req: any, @Param('id') id: string) {
+    if (!(Array.isArray(req.user?.roles) && req.user.roles.includes('system'))) throw new ForbiddenException();
+    return this.review.partnerType(id);
+  }
+
+  @Get('bank/internal/:id/payable')
+  @ApiOperation({ summary: 'Internal (booking): may this partner receive a payout now?' })
+  payable(@Req() req: any, @Param('id') id: string) {
+    if (!(Array.isArray(req.user?.roles) && req.user.roles.includes('system'))) throw new ForbiddenException();
+    return this.review.payable(id);
+  }
+
   @Get('ops/:id/payout-account')
   @ApiOperation({ summary: 'Ops: full payee bank details for paying a payout' })
```

#### vizito-auth — `src/partners/partners.service.ts`

```diff
@@ -19,4 +19,5 @@ import { CreateClinicBranchDto } from './dto/create-clinic-branch.dto';
 import { CreatePartnerDto } from './dto/create-partner.dto';
 import { UpdatePartnerDto } from './dto/update-partner.dto';
+import { AUTO_REVIEWER, autoApproveVerifications } from './auto-approval';
 import { UpdateProfileDto } from './dto/update-profile.dto';
 import { CreateAddressDto } from './dto/create-address.dto';
@@ -377,4 +378,5 @@ async createPartnerFromRegistration(
     case 'ambulance':
     case 'equipment':
+    case 'bloodbank':
       businessName = registerDto.organizationName ?? '';
       break;
@@ -388,4 +390,5 @@ async createPartnerFromRegistration(
     registerDto.drugLicenseNo ??
     registerDto.laboratoryRegNo ??
+    registerDto.bloodBankRegNo ??
     '';
 
@@ -859,4 +862,5 @@ async createPartnerFromRegistration(
       bank = this.bankRepo.create({ partner_id: partnerId, account_holder_name: dto.account_holder_name || '', bank_name: dto.bank_name || '', branch_name: dto.branch_name || '', account_number: dto.account_number || '', ifsc: dto.ifsc_code || dto.ifsc || '' });
     }
+    const before = `${bank.account_holder_name}|${bank.account_number}|${bank.ifsc}`;
     if (dto.account_holder_name !== undefined) bank.account_holder_name = dto.account_holder_name;
     if (dto.account_number !== undefined) bank.account_number = dto.account_number;
@@ -864,4 +868,18 @@ async createPartnerFromRegistration(
     if (dto.ifsc_code !== undefined || dto.ifsc !== undefined) bank.ifsc = dto.ifsc_code || dto.ifsc;
     if (dto.branch_name !== undefined) bank.branch_name = dto.branch_name;
+    // Blood Bank PF-03: where the money goes changed, so the account must be verified again before any payout.
+    if (`${bank.account_holder_name}|${bank.account_number}|${bank.ifsc}` !== before) {
+      bank.verification_status = 'Pending';
+      bank.verified_by = null;
+      bank.verified_at = null;
+      bank.review_note = null;
+    }
+    // Auto-approval (owner 2026-10-10, AUTO_APPROVE_PARTNER_VERIFICATIONS, default on): a complete account is verified by the system, recorded as such.
+    if (autoApproveVerifications() && bank.verification_status !== 'Verified' && bank.account_holder_name && bank.account_number && bank.ifsc) {
+      bank.verification_status = 'Verified';
+      bank.verified_by = AUTO_REVIEWER;
+      bank.verified_at = new Date();
+      bank.review_note = null;
+    }
     return await this.bankRepo.save(bank);
   }
```

#### vizito-auth — `src/partners/staff.controller.ts`

```diff
@@ -56,5 +56,5 @@ export class StaffController {
   @ApiResponse({ status: 403, description: 'Branch not owned / insufficient permission' })
   create(@Req() req: any, @Body() dto: CreateHospitalStaffDto) {
-    return this.staffService.createStaff(this.provider(req), dto, req.headers?.['x-user']);
+    return this.staffService.createStaff(this.provider(req), dto, req.headers?.['x-user'], req.user);
   }
 
@@ -76,5 +76,5 @@ export class StaffController {
     // account isn't staff at all (is_staff is unset), so this never affects owners.
     const callerStaffId = req.user?.is_staff === true ? req.user?.staff_id : undefined;
-    return this.staffService.updateStaff(this.provider(req), id, dto, req.headers?.['x-user'], callerStaffId);
+    return this.staffService.updateStaff(this.provider(req), id, dto, req.headers?.['x-user'], callerStaffId, req.user);
   }
 
```

#### vizito-auth — `src/partners/staff.service.ts`

```diff
@@ -15,4 +15,5 @@ import { UsersService } from '../users/users.service';
 import { HashHelper } from '../utils/hash.util';
 import { CreateHospitalStaffDto, UpdateHospitalStaffDto } from './dto/hospital-staff.dto';
+import { assertBloodBankGrantAllowed } from './bloodbank-staff.permissions';
 import { PASSWORD_POLICY, PASSWORD_POLICY_MESSAGE } from '../common/validators/identity.validators';
 
@@ -129,6 +130,7 @@ export class StaffService {
   }
 
-  async createStaff(partnerId: string | undefined, dto: CreateHospitalStaffDto, xUser?: string) {
+  async createStaff(partnerId: string | undefined, dto: CreateHospitalStaffDto, xUser?: string, caller?: any) {
     const provider = this.requireProvider(partnerId);
+    assertBloodBankGrantAllowed(dto.permissions, caller);
 
     if (dto.facility_id) {
@@ -191,5 +193,5 @@ export class StaffService {
   }
 
-  async updateStaff(partnerId: string | undefined, id: string, dto: UpdateHospitalStaffDto, xUser?: string, callerStaffId?: string) {
+  async updateStaff(partnerId: string | undefined, id: string, dto: UpdateHospitalStaffDto, xUser?: string, callerStaffId?: string, caller?: any) {
     const provider = this.requireProvider(partnerId);
     const link = await this.getOwnedLink(provider, id);
@@ -201,4 +203,5 @@ export class StaffService {
       throw new ForbiddenException('You cannot edit your own staff record.');
     }
+    if (dto.permissions !== undefined) assertBloodBankGrantAllowed(dto.permissions, caller);
 
     if (dto.facility_id !== undefined && dto.facility_id !== null) {
```

#### vizito-auth — `src/roles/roles.service.ts`

```diff
@@ -26,4 +26,5 @@ export class RolesService implements OnApplicationBootstrap {
       { name: 'ambulance', description: 'ambulance ' },
       { name: 'equipment', description: 'equipment ' },
+      { name: 'bloodbank', description: 'Blood bank' },
       { name: 'patient', description: 'patient' }
     ];
```

#### vizito-booking — `src/app.module.ts`

```diff
@@ -20,4 +20,6 @@ import { TransactionsModule } from './transactions/transactions.module';
 import { NotificationsModule } from './notifications/notifications.module';
 import { PaymentsModule } from './payments/payments.module';
+import { BloodBankModule } from './bloodbank/bloodbank.module';
+import { CommissionModule } from './commission/commission.module';
 import { HealthModule } from './health/health.module';
 
@@ -70,4 +72,6 @@ import { HealthModule } from './health/health.module';
     NotificationsModule,
     PaymentsModule,
+    CommissionModule, // Blood Bank PF-03: per-business-type commission (Ops sets the Blood Bank rate)
+    BloodBankModule, // Blood Bank: stock, requests, requisitions, donors, payouts, insights
   ],
   // controllers: [AppController],
```

#### vizito-booking — `src/common/guards/staff-permissions.guard.ts`

```diff
@@ -24,4 +24,7 @@ const ALIASES: Record<string, string[]> = {
   'appointments.edit': ['appointmentManagement.reschedule', 'appointmentManagement.cancel', 'appointmentManagement.checkIn'],
   'transactions.view': ['revenue.view', 'sales.view'],
+  // Blood Bank: reading sessions / the donor desk. The Results officer needs it to reach a donation's
+  // confidential results; changing anything on the desk still needs bloodbank.donor.
+  'bloodbank.donor_read': ['bloodbank.donor', 'bloodbank.donor_results'],
 };
 
```

#### vizito-booking — `src/notifications/notifications.service.ts`

```diff
@@ -279,5 +279,5 @@ export class NotificationsService {
   // events). Skips silently when no real recipient id is supplied — never invents one.
   async notifyOne(input: {
-    recipient_type: 'patient' | 'doctor' | 'hospital' | 'staff';
+    recipient_type: 'patient' | 'doctor' | 'hospital' | 'staff' | 'bloodbank';
     recipient_id?: string;
     title: string;
```

#### vizito-booking — `src/payments/payments.service.ts`

```diff
@@ -180,4 +180,5 @@ export class PaymentsService {
     amount: number,
     referenceId: string,
+    feeRate?: number, // Blood Bank (PF-03): its Ops-configured commission (0–1); omitted = PLATFORM_FEE_RATE
   ): Promise<void> {
     const queryRunner = this.dataSource.createQueryRunner();
@@ -185,5 +186,5 @@ export class PaymentsService {
     await queryRunner.startTransaction();
     try {
-      await this.recordTransaction(queryRunner, booking, dto, amount, true, referenceId);
+      await this.recordTransaction(queryRunner, booking, dto, amount, true, referenceId, feeRate);
       await queryRunner.commitTransaction();
     } catch (error) {
@@ -212,7 +213,9 @@ export class PaymentsService {
     success: boolean,
     referenceId: string,
+    feeRate?: number,
   ): Promise<void> {
+    const rate = feeRate !== undefined && Number.isFinite(feeRate) && feeRate >= 0 && feeRate <= 1 ? feeRate : PaymentsService.PLATFORM_FEE_RATE;
     const platformFee = success
-      ? Math.round(amount * PaymentsService.PLATFORM_FEE_RATE * 100) / 100
+      ? Math.round(amount * rate * 100) / 100
       : 0;
     const netAmount = Math.max(0, amount - platformFee);
```

#### vizito-booking — `src/transactions/ops-payouts.service.ts`

```diff
@@ -1,3 +1,4 @@
-import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
+import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
+import { ConfigService } from '@nestjs/config';
 import { InjectRepository } from '@nestjs/typeorm';
 import { DataSource, Repository } from 'typeorm';
@@ -19,6 +20,25 @@ export class OpsPayoutsService {
     @InjectRepository(Transaction) private readonly txns: Repository<Transaction>,
     private readonly dataSource: DataSource,
+    private readonly config: ConfigService,
   ) {}
 
+  /** Blood Bank PF-03: money may only leave for a payable account (auth gates blood banks only; other types pass). */
+  private async assertPayable(partnerId: string | null) {
+    if (!partnerId) return;
+    let res: Response;
+    try {
+      const auth = this.config.get<string>('AUTH_SERVICE_URL') || this.config.get<string>('AUTH_MICROSERVICE_URL') || 'http://localhost:4401';
+      res = await fetch(`${auth}/partners/bank/internal/${encodeURIComponent(partnerId)}/payable`, {
+        headers: { 'x-gateway-secret': this.config.getOrThrow<string>('GATEWAY_INTERNAL_SECRET'), 'x-user': JSON.stringify({ sub: 'booking-service', roles: ['system'] }) },
+        signal: AbortSignal.timeout(5000),
+      });
+    } catch {
+      throw new ServiceUnavailableException('Could not check the bank account right now. Try again in a minute.');
+    }
+    if (!res.ok) throw new ServiceUnavailableException('Could not check the bank account right now. Try again in a minute.');
+    const v = (await res.json()) as { payable: boolean; reason: string | null };
+    if (!v.payable) throw new BadRequestException(`This payout cannot be sent: ${v.reason || 'the bank account is not payable.'}`);
+  }
+
   private payee(r: SettlementRequest) {
     return (r as any).partner_id || (r as any).hospital_id || (r as any).doctor_id || null;
@@ -87,4 +107,6 @@ export class OpsPayoutsService {
     const note = (text: string) => `${r.remarks ? `${r.remarks}\n` : ''}${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })} IST · ${reviewer}: ${text}`;
 
+    if (action === 'Process' || action === 'Paid') await this.assertPayable(this.payee(r));
+
     if (action === 'Process') {
       if (from !== 'Requested') throw new BadRequestException(`Only a requested payout can be started (this one is ${from}).`);
```

#### vizito-catalogue — `src/app.module.ts`

```diff
@@ -30,4 +30,5 @@ import { DiscountModule } from './discount/discount.module';
 import { InventoryMovementModule } from './inventory-movement/inventory-movement.module';
 import { OrdersModule } from './orders/orders.module';
+import { BloodReferenceModule } from './blood-reference/blood-reference.module';
 import { HealthModule } from './health/health.module';
 
@@ -83,4 +84,5 @@ import { HealthModule } from './health/health.module';
     InventoryMovementModule,
     OrdersModule,
+    BloodReferenceModule, // Blood Bank D1: components + blood groups
   ],
   //  controllers: [AppController],
```

#### vizito-server — `src/proxy/proxy.service.ts`

```diff
@@ -127,6 +127,8 @@ export class ProxyService {
         'transactions': 'BOOKINGS_MICROSERVICE_URL',
         'notifications': 'BOOKINGS_MICROSERVICE_URL',
+        'bloodbank': 'BOOKINGS_MICROSERVICE_URL', // Blood Bank: stock, requests, donors (licence is under /partners/bloodbank on auth)
         'revenue': 'BOOKINGS_MICROSERVICE_URL',
         'settlements': 'BOOKINGS_MICROSERVICE_URL',
+        'commission': 'BOOKINGS_MICROSERVICE_URL', // Blood Bank PF-03: per-business-type commission (Ops)
         'settlement': 'BOOKINGS_MICROSERVICE_URL',
       };
```

#### partner — `vizito-partner-main/src/data/services/authHelper.ts`

```diff
@@ -12,4 +12,5 @@ export const PROVIDER_TYPE_MAP: Record<string, number> = {
   homecare: 8,
   ambulance: 9,
+  bloodbank: 11,
   equipment: 10
 };
@@ -39,4 +40,5 @@ export interface RegisterProviderPayload {
   laboratoryName?: string;
   laboratoryRegNo?: string;
+  bloodBankRegNo?: string;
   organizationName?: string;
 }
```

#### partner — `vizito-partner-main/src/data/store/role/RoleContext.tsx`

```diff
@@ -30,4 +30,5 @@ export const normalizeRole = (r: any): UserRole | null => {
   if (roleStr === 'homecare' || roleStr === '8') return 'homecare';
   if (roleStr === 'ambulance' || roleStr === '9') return 'ambulance';
+  if (roleStr === 'bloodbank') return 'bloodbank';
   if (roleStr === 'equipment' || roleStr === '10') return 'equipment';
   // Unknown/unmapped role — never assume Doctor.
```

#### partner — `vizito-partner-main/src/presentation/components/AuthModule.tsx`

```diff
@@ -40,4 +40,5 @@ const PROVIDER_ROLE_KEY: Record<UserRole, string> = {
   ambulance: 'ambulance',
   equipment: 'equipment',
+  bloodbank: 'bloodbank',
 };
 
```

#### partner — `vizito-partner-main/src/presentation/components/RegistrationModule.tsx`

```diff
@@ -21,5 +21,6 @@ import {
   EyeOff,
   Check,
-  ShieldCheck
+  ShieldCheck,
+  Droplets
 } from 'lucide-react';
 import { Formik, Form } from 'formik';
@@ -69,6 +70,6 @@ interface RegistrationModuleProps {
 
 // Business types that can sign up today (their portal and patient booking both work end to end).
-const OPEN_TYPES = ['doctor', 'hospital', 'clinic', 'pharmacy'];
-const BACKEND_TYPE: Record<string, string> = { doctor: 'doctor', hospital: 'hospitaladmin', clinic: 'clinicowner', pharmacy: 'pharmacy' };
+const OPEN_TYPES = ['doctor', 'hospital', 'clinic', 'pharmacy', 'bloodbank'];
+const BACKEND_TYPE: Record<string, string> = { doctor: 'doctor', hospital: 'hospitaladmin', clinic: 'clinicowner', pharmacy: 'pharmacy', bloodbank: 'bloodbank' };
 
 const STEP1_STORAGE_KEY = 'vizito_registration_step1';
@@ -171,4 +172,5 @@ export default function RegistrationModule({
     laboratoryRegNo: '',
     organizationName: '',
+    bloodBankRegNo: '',
     authorizedPersonName: ''
   });
@@ -199,5 +201,5 @@ export default function RegistrationModule({
           else if (providerCategory === 'pharmacy') targetInputName = 'pharmacyName';
           else if (providerCategory === 'diagnostic') targetInputName = 'laboratoryName';
-          else if (providerCategory === 'homecare' || providerCategory === 'ambulance' || providerCategory === 'equipment') targetInputName = 'organizationName';
+          else if (providerCategory === 'homecare' || providerCategory === 'ambulance' || providerCategory === 'equipment' || providerCategory === 'bloodbank') targetInputName = 'organizationName';
 
           const input = document.querySelector(`input[name="${targetInputName}"]`) as HTMLInputElement | null;
@@ -251,4 +253,12 @@ export default function RegistrationModule({
       bgHover: "hover:border-teal-500/30 hover:shadow-teal-500/5 hover:bg-teal-50/30"
     },
+    {
+      id: 'bloodbank' as UserRole,
+      title: "Blood Bank / Blood Centre",
+      description: "Manage licensed blood stock, donor sessions, blood requests, cross-matching and issue records.",
+      icon: Droplets,
+      color: "text-rose-600",
+      bgHover: "hover:border-rose-500/30 hover:shadow-rose-500/5 hover:bg-rose-50/30"
+    },
     {
       id: 'homecare' as UserRole,
@@ -412,4 +422,11 @@ export default function RegistrationModule({
           authorizedPersonName: personNameSchema('Authorized Person Name'),
         });
+      case 'bloodbank':
+        return Yup.object().shape({
+          organizationName: Yup.string().trim().required('Blood Bank Name is required'),
+          // The server intentionally checks presence only until the state confirms a format.
+          bloodBankRegNo: Yup.string().trim().required('Blood Bank Registration Number is required').max(60, 'Blood Bank Registration Number must be 60 characters or fewer'),
+          authorizedPersonName: personNameSchema('Authorized Person Name'),
+        });
       case 'homecare':
       case 'ambulance':
@@ -476,6 +493,8 @@ export default function RegistrationModule({
       case 'ambulance':
       case 'equipment':
+      case 'bloodbank':
         professionalInfo = {
           organizationName: step3Values.organizationName,
+          ...(providerCategory === 'bloodbank' ? { bloodBankRegNo: step3Values.bloodBankRegNo } : {}),
           authorizedPersonName: step3Values.authorizedPersonName
         };
@@ -512,5 +531,5 @@ export default function RegistrationModule({
     const categoryMap: Record<string, string> = {
       doctor: 'doctor', hospital: 'hospitalAdmin', clinic: 'clinicOwner', pharmacy: 'pharmacy',
-      diagnostic: 'diagnostic', homecare: 'homecare', ambulance: 'ambulance', equipment: 'equipment',
+      diagnostic: 'diagnostic', homecare: 'homecare', ambulance: 'ambulance', equipment: 'equipment', bloodbank: 'bloodbank',
     };
     const key = categoryMap[providerCategory || ''];
@@ -555,4 +574,5 @@ export default function RegistrationModule({
       laboratoryRegNo: step3Values.laboratoryRegNo || undefined,
       organizationName: step3Values.organizationName || undefined,
+      bloodBankRegNo: step3Values.bloodBankRegNo || undefined,
     };
 
@@ -585,4 +605,7 @@ export default function RegistrationModule({
     pharmacyName: step3Values.pharmacyName || undefined,
     drugLicenseNo: step3Values.drugLicenseNo || undefined,
+    // Blood Bank: adding a blood bank to an existing login sends its name and registration number too.
+    organizationName: step3Values.organizationName || undefined,
+    bloodBankRegNo: step3Values.bloodBankRegNo || undefined,
   });
 
@@ -1461,8 +1484,8 @@ export default function RegistrationModule({
 
                     {/* Generic / Home Care / Ambulance / Equipment Specific Fields */}
-                    {(providerCategory === 'homecare' || providerCategory === 'ambulance' || providerCategory === 'equipment') && (
+                    {(providerCategory === 'homecare' || providerCategory === 'ambulance' || providerCategory === 'equipment' || providerCategory === 'bloodbank') && (
                       <>
                         <div className="form-group mb-0">
-                          <label className="form-label">Organization Name *</label>
+                          <label className="form-label">{providerCategory === 'bloodbank' ? 'Blood Bank Name *' : 'Organization Name *'}</label>
                           <input
                             type="text"
@@ -1479,4 +1502,23 @@ export default function RegistrationModule({
                         </div>
 
+                        {providerCategory === 'bloodbank' && (
+                          <div className="form-group mb-0">
+                            <label className="form-label">Blood Bank Registration Number *</label>
+                            <input
+                              type="text"
+                              name="bloodBankRegNo"
+                              className={`form-control ${touched.bloodBankRegNo && errors.bloodBankRegNo ? 'border-rose-450' : ''}`}
+                              placeholder="Enter the registration number shown on your certificate"
+                              value={values.bloodBankRegNo}
+                              maxLength={60}
+                              onChange={handleChange}
+                              onBlur={handleBlur}
+                            />
+                            {touched.bloodBankRegNo && errors.bloodBankRegNo && (
+                              <p className="text-rose-500 text-xs mt-1 font-bold">{errors.bloodBankRegNo}</p>
+                            )}
+                          </div>
+                        )}
+
                         <div className="form-group">
                           <label className="form-label">Authorized Person Name *</label>
@@ -1723,10 +1765,14 @@ export default function RegistrationModule({
                   )}
 
-                  {(providerCategory === 'homecare' || providerCategory === 'ambulance' || providerCategory === 'equipment') && (
+                  {(providerCategory === 'homecare' || providerCategory === 'ambulance' || providerCategory === 'equipment' || providerCategory === 'bloodbank') && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                       <div>
-                        <span className="text-xs font-bold text-slate-400 block">Organization Name</span>
+                        <span className="text-xs font-bold text-slate-400 block">{providerCategory === 'bloodbank' ? 'Blood Bank Name' : 'Organization Name'}</span>
                         <span className="text-sm font-semibold text-slate-800">{step3Values.organizationName}</span>
                       </div>
+                      {providerCategory === 'bloodbank' && <div>
+                        <span className="text-xs font-bold text-slate-400 block">Registration Number</span>
+                        <span className="text-sm font-semibold text-slate-800">{step3Values.bloodBankRegNo}</span>
+                      </div>}
                       <div>
                         <span className="text-xs font-bold text-slate-400 block">Authorized Representative</span>
```

#### partner — `vizito-partner-main/src/presentation/components/UserTypeSelection.tsx`

```diff
@@ -20,4 +20,5 @@ export type UserRole =
   | 'homecare' 
   | 'ambulance'
+  | 'bloodbank'
   | 'equipment';
 
```

#### partner — `vizito-partner-main/src/presentation/engines/SidebarEngine/SidebarEngine.tsx`

```diff
@@ -30,9 +30,12 @@ import {
     Bell,
     ShieldCheck,
-    ChevronDown
+    ChevronDown,
+    Droplets,
+    Activity
 } from 'lucide-react';
 import { useRole } from '../../../data/store/role/RoleContext';
 import { useLanguage } from '../../../data/store/language/LanguageContext';
 import { useHospitalRole } from '../../../data/store/hospital/HospitalRoleContext';
+import { canOpenBloodScreen } from '../../../data/services/bloodbankHelper';
 import { type StaffPermissions } from '../../../data/mocks/hospitalMocks';
 import logoImg from '../../../assets/vizito_logo.png';
@@ -118,4 +121,16 @@ const allNavItems = [
     { name: 'Fleet Management', path: '/ambulance-fleet', icon: Ambulance, roles: ['ambulance'] },
     { name: 'Driver & Staff Roster', path: '/ambulance-drivers', icon: Contact, roles: ['ambulance'] },
+
+    // Blood Bank Nav (each item is also filtered by the user's Blood Bank permissions below)
+    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['bloodbank'] },
+    { name: 'Blood stock', path: '/bloodbank-stock', icon: Droplets, roles: ['bloodbank'] },
+    { name: 'Blood requests', path: '/bloodbank-requests', icon: FileCheck, roles: ['bloodbank'] },
+    { name: 'Donors', path: '/bloodbank-donors', icon: UsersRound, roles: ['bloodbank'] },
+    { name: 'Reports', path: '/bloodbank-reports', icon: Activity, roles: ['bloodbank'] },
+    // Processing charges (blood is never sold). Owner, or staff with the Finance permission.
+    { name: 'Processing charges', path: '/bloodbank-finance', icon: Wallet, roles: ['bloodbank'] },
+    { name: 'Stock activity', path: '/bloodbank-activity', icon: ClipboardList, roles: ['bloodbank'] },
+    { name: 'Staff', path: '/bloodbank-staff', icon: Contact, roles: ['bloodbank'] },
+    { name: 'Licence & settings', path: '/bloodbank-licence', icon: ShieldCheck, roles: ['bloodbank'] },
 ];
 
@@ -135,4 +150,5 @@ const normalizeRoleStr = (r: any): string => {
     if (roleStr === 'homecare' || roleStr === '8') return 'homecare';
     if (roleStr === 'ambulance' || roleStr === '9') return 'ambulance';
+    if (roleStr === 'bloodbank') return 'bloodbank';
     return roleStr;
 };
@@ -151,4 +167,6 @@ const SidebarEngine: React.FC<SidebarEngineProps> = ({ isOpen = false, onClose }
             const hasRole = item.roles.includes(activeRole as any);
             if (!hasRole) return false;
+            // Blood Bank: owner sees all; staff see only the screens their Blood Bank permissions cover.
+            if (activeRole === 'bloodbank' && !canOpenBloodScreen(item.path)) return false;
 
             // If hospital role, check specific permissions
```

#### partner — `vizito-partner-main/src/presentation/layouts/MainLayout.tsx`

```diff
@@ -6,5 +6,5 @@ import {
   Bell, Search, Menu, ChevronDown, User, Settings, LogOut,
   Stethoscope, Building, Building2, Pill, Microscope, Home, Truck, Package, Check,
-  ArrowLeft,
+  ArrowLeft, Droplets,
 } from 'lucide-react';
 import { useRole, normalizeRole } from '../../data/store/role/RoleContext';
@@ -30,4 +30,5 @@ const ROLE_META: Record<UserRole, { icon: ReactNode; label: string }> = {
   homecare: { icon: <Home className="w-3.5 h-3.5" />, label: 'Homecare' },
   ambulance: { icon: <Truck className="w-3.5 h-3.5" />, label: 'Ambulance' },
+  bloodbank: { icon: <Droplets className="w-3.5 h-3.5" />, label: 'Blood bank' },
   equipment: { icon: <Package className="w-3.5 h-3.5" />, label: 'Equipment' },
 };
```

#### partner — `vizito-partner-main/src/presentation/modules/appointments/ConsultationWorkspace.tsx`

```diff
@@ -23,4 +23,5 @@ import { useConfirm } from '../../components/ConfirmModal';
 import MedicineInput from '../../components/clinical/MedicineInput';
 import RecordPaymentModal from './RecordPaymentModal';
+import BloodRequisitionDialog from '../bloodbank/BloodRequisitionDialog'; // Blood Bank
 
 // The doctor's consultation, on its own page: patient context pinned on the left, one scrolling
@@ -109,4 +110,5 @@ const ConsultationWorkspace: React.FC = () => {
   const [notFound, setNotFound] = useState(false);
   const [appt, setAppt] = useState<any>(null);
+  const [bloodReqOpen, setBloodReqOpen] = useState(false); // Blood Bank
   // Allergies: recorded at earlier visits (read-only) and at this visit (editable).
   type Allergy = { allergen: string; reaction: string; severity: string };
@@ -482,4 +484,7 @@ const ConsultationWorkspace: React.FC = () => {
             </p>
           </div>
+          {/* Blood Bank: structured blood requisition from this consultation */}
+          <button type="button" onClick={() => setBloodReqOpen(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-rose-200 bg-white text-rose-700 text-xs font-bold hover:bg-rose-50">Blood requisition</button>
+          {bloodReqOpen && <BloodRequisitionDialog appointmentId={appointmentId} onClose={() => setBloodReqOpen(false)} />}
           <div className="flex items-center gap-2 text-xs font-semibold" aria-live="polite">
             {locked ? (
```

#### partner — `vizito-partner-main/src/presentation/modules/notifications/NotificationsScreen.tsx`

```diff
@@ -12,5 +12,5 @@ import {
   Check, MoreVertical, CalendarClock, Calendar, Wallet, Star, Video,
   FileText, ShieldCheck, Megaphone, User, Filter, ChevronLeft, ChevronRight,
-  ChevronDown, ArrowRight, BellRing, Search, X, Trash2, Eye
+  ChevronDown, ArrowRight, BellRing, Search, X, Trash2, Eye, Droplets
 } from 'lucide-react';
 import { useNavigate } from 'react-router-dom';
@@ -25,5 +25,5 @@ interface NotificationItem {
   timestamp: string; // ISO format for sorting
   unread: boolean;
-  category: 'Appointment' | 'Consultation' | 'Prescription' | 'Settlement' | 'Availability' | 'Association' | 'Profile' | 'System';
+  category: 'Appointment' | 'Consultation' | 'Prescription' | 'Settlement' | 'Availability' | 'Association' | 'Profile' | 'Blood licence' | 'Blood stock' | 'Blood request' | 'System';
   targetId?: string; // Links to record IDs
   priority: 'high' | 'normal';
@@ -49,4 +49,8 @@ const normalizeCategory = (raw: string): NotificationItem['category'] => {
   if (c === 'availability') return 'Availability';
   if (c === 'profile') return 'Profile';
+  // Blood Bank
+  if (c === 'bloodbank_licence') return 'Blood licence';
+  if (c === 'bloodbank_expiry') return 'Blood stock';
+  if (c === 'bloodbank_request') return 'Blood request';
   return 'System';
 };
@@ -64,5 +68,5 @@ export default function NotificationsScreen() {
   const [searchQuery, setSearchQuery] = useState('');
   const [statusFilter, setStatusFilter] = useState<'All' | 'Unread' | 'Read'>('All');
-  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Appointment' | 'Consultation' | 'Prescription' | 'Settlement' | 'Availability' | 'Association' | 'Profile' | 'System'>('All');
+  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Appointment' | 'Consultation' | 'Prescription' | 'Settlement' | 'Availability' | 'Association' | 'Profile' | 'Blood licence' | 'Blood stock' | 'Blood request' | 'System'>('All');
   const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month'>('All');
 
@@ -154,4 +158,8 @@ export default function NotificationsScreen() {
     // with no real pharmacy destination, fall back to the detail modal instead of
     // navigating somewhere wrong.
+    // Blood Bank
+    if (notif.category === 'Blood licence') { navigate('/bloodbank-licence'); return; }
+    if (notif.category === 'Blood stock') { navigate('/dashboard?filter=expiring'); return; }
+    if (notif.category === 'Blood request') { navigate(notif.targetId ? `/bloodbank-requests?open=${encodeURIComponent(notif.targetId)}` : '/bloodbank-requests'); return; }
     if (role === 'pharmacy') {
       if (notif.category === 'Prescription') {
@@ -245,4 +253,7 @@ export default function NotificationsScreen() {
     Association: Megaphone,
     Profile: User,
+    'Blood licence': ShieldCheck,
+    'Blood stock': Droplets,
+    'Blood request': Droplets,
     System: ShieldCheck
   };
@@ -256,4 +267,7 @@ export default function NotificationsScreen() {
     Association: 'bg-teal-50 text-teal-700 border-teal-100',
     Profile: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
+    'Blood licence': 'bg-rose-50 text-rose-700 border-rose-100',
+    'Blood stock': 'bg-rose-50 text-rose-700 border-rose-100',
+    'Blood request': 'bg-rose-50 text-rose-700 border-rose-100',
     System: 'bg-slate-100 text-slate-700 border-slate-200'
   };
```

#### partner — `vizito-partner-main/src/presentation/navigation/AppNavigator.tsx`

```diff
@@ -76,4 +76,16 @@ import StaffDirectoryScreen from '../modules/homecare/staff/StaffDirectoryScreen
 import CareBookingsScreen from '../modules/homecare/bookings/CareBookingsScreen';
 
+// Blood Bank
+import BloodStockScreen from '../modules/bloodbank/BloodStockScreen';
+import BloodDashboardScreen from '../modules/bloodbank/BloodDashboardScreen';
+import { BLOOD_SCREEN_ACCESS, canOpenBloodScreen } from '../../data/services/bloodbankHelper';
+import BloodActivityScreen from '../modules/bloodbank/BloodActivityScreen';
+import BloodLicenceScreen from '../modules/bloodbank/BloodLicenceScreen';
+import BloodBankProfileScreen from '../modules/bloodbank/BloodBankProfileScreen';
+import BloodRequestsScreen from '../modules/bloodbank/BloodRequestsScreen';
+import BloodDonorsScreen from '../modules/bloodbank/BloodDonorsScreen';
+import BloodReportsScreen from '../modules/bloodbank/BloodReportsScreen';
+import BloodBankStaffScreen from '../modules/bloodbank/BloodBankStaffScreen';
+import BloodFinanceScreen from '../modules/bloodbank/BloodFinanceScreen';
 // Ambulance Screens
 import AmbulanceDashboardEngine from '../engines/DashboardEngine/AmbulanceDashboardEngine';
@@ -154,4 +166,12 @@ const HospitalModuleGuard = ({ module, children }: { module: keyof StaffPermissi
 };
 
+// Blood bank staff may open only the screens their permissions cover (the server refuses the data anyway).
+// A blocked screen sends them to the first one they can open, so a typed URL never shows a broken page.
+const BloodGate = ({ path, children }: { path: string; children: React.ReactNode }) => {
+  if (canOpenBloodScreen(path)) return <>{children}</>;
+  const first = Object.keys(BLOOD_SCREEN_ACCESS).find((p) => p !== path && canOpenBloodScreen(p));
+  return first ? <Navigate to={first} replace /> : <p className="p-8 text-sm text-slate-500">Your account has no Blood Bank screens yet. Ask the account owner to set your permissions.</p>;
+};
+
 const DashboardRouter = () => {
   const { role } = useRole();
@@ -162,4 +182,5 @@ const DashboardRouter = () => {
   if (role === 'homecare') return <HomecareDashboardEngine />;
   if (role === 'ambulance') return <AmbulanceDashboardEngine />;
+  if (role === 'bloodbank') return <BloodGate path="/dashboard"><BloodDashboardScreen /></BloodGate>;
   if (role === 'doctor') return <DoctorDashboardEngine />;
   // Unknown/missing role — do NOT assume Doctor.
@@ -226,4 +247,14 @@ const AppNavigator = () => {
           <Route path="/lab-reports" element={<LabReportsScreen />} />
 
+          {/* Blood Bank Routes */}
+          <Route path="/bloodbank-stock" element={<BloodGate path="/bloodbank-stock"><BloodStockScreen /></BloodGate>} />
+          <Route path="/bloodbank-activity" element={<BloodGate path="/bloodbank-activity"><BloodActivityScreen /></BloodGate>} />
+          <Route path="/bloodbank-licence" element={<BloodGate path="/bloodbank-licence"><BloodLicenceScreen /></BloodGate>} />
+          <Route path="/bloodbank-requests" element={<BloodGate path="/bloodbank-requests"><BloodRequestsScreen /></BloodGate>} />
+          <Route path="/bloodbank-donors" element={<BloodGate path="/bloodbank-donors"><BloodDonorsScreen /></BloodGate>} />
+          <Route path="/bloodbank-reports" element={<BloodGate path="/bloodbank-reports"><BloodReportsScreen /></BloodGate>} />
+          <Route path="/bloodbank-staff" element={<BloodGate path="/bloodbank-staff"><BloodBankStaffScreen /></BloodGate>} />
+          <Route path="/bloodbank-finance" element={<BloodGate path="/bloodbank-finance"><BloodFinanceScreen /></BloodGate>} />
+
           {/* Home Care Routes */}
           <Route path="/homecare-services" element={<ServicesScreen />} />
@@ -280,4 +311,5 @@ const ProfileLayoutRouter = () => {
   if (role === 'clinic') return <ClinicProfileScreen />;
   if (role === 'pharmacy') return <PharmacyProfileScreen />;
+  if (role === 'bloodbank') return <BloodBankProfileScreen />;
   return <ProfileLayout />;
 };
```

#### patient — `src/config/serviceTypes.ts`

```diff
@@ -29,3 +29,4 @@ export const SERVICE_TILES: ServiceTile[] = [
   { id: 'diagnostic',name: 'Diagnostic Laboratory',     shortDesc: 'Home Sample Collection',           iconName: 'TestTube',     emoji: '🧪', tileClass: 'bg-teal-50 text-teal-600 border-teal-100', available: false },
   { id: 'equipment', name: 'Medical Equipment Rental',  shortDesc: 'O2 Concentrators & ICU Beds',      iconName: 'Package',      emoji: '🦽', tileClass: 'bg-cyan-50 text-cyan-600 border-cyan-100', available: false },
+  { id: 'bloodbank', name: 'Find Blood',                shortDesc: 'Blood availability at verified blood banks', iconName: 'Droplets', emoji: '🩸', tileClass: 'bg-rose-50 text-rose-600 border-rose-100', available: true },
 ];
```

#### patient — `src/layouts/MainLayout.tsx`

```diff
@@ -219,5 +219,5 @@ const MainLayout = () => {
                               onClick={() => {
                                 setIsSearchOpen(false);
-                                navigate(svc.id === 'pharmacy' ? '/pharmacy-orders/new' : `/booking?service=${svc.id}`);
+                                navigate(svc.id === 'pharmacy' ? '/pharmacy-orders/new' : svc.id === 'bloodbank' ? '/find-blood' : `/booking?service=${svc.id}`);
                               }}
                               className="w-full text-left px-3 py-2 rounded-xl hover:bg-teal-50/60 flex items-center justify-between group transition-colors"
```

#### patient — `src/navigation/AppNavigator.tsx`

```diff
@@ -13,4 +13,8 @@ import RegistrationModule from '../presentation/modules/auth/RegistrationModule'
 import PatientDashboard from '../presentation/modules/dashboard/PatientDashboard';
 import HealthcareServicesScreen from '../presentation/modules/services/HealthcareServicesScreen';
+import FindBloodScreen from '../presentation/modules/bloodbank/FindBloodScreen';
+import RequestBloodScreen from '../presentation/modules/bloodbank/RequestBloodScreen';
+import MyBloodRequestsScreen from '../presentation/modules/bloodbank/MyBloodRequestsScreen';
+import DonateBloodScreen from '../presentation/modules/bloodbank/DonateBloodScreen';
 import UniversalBookingScreen from '../presentation/modules/booking/UniversalBookingScreen';
 import MyConsultationsScreen from '../presentation/modules/bookings/MyConsultationsScreen';
@@ -132,4 +136,9 @@ const AppNavigator = () => {
         <Route path="/ambulance-dispatch" element={<UniversalBookingScreen />} />
         <Route path="/lab-tests" element={<UniversalBookingScreen />} />
+        {/* Blood Bank */}
+        <Route path="/find-blood" element={<FindBloodScreen />} />
+        <Route path="/request-blood" element={<RequestBloodScreen />} />
+        <Route path="/blood-requests" element={<MyBloodRequestsScreen />} />
+        <Route path="/donate-blood" element={<DonateBloodScreen />} />
         <Route path="/equipment-rentals" element={<UniversalBookingScreen />} />
         <Route path="/find-doctors" element={<BookConsultationScreen />} />
```

#### patient — `src/presentation/components/Sidebar.tsx`

```diff
@@ -14,5 +14,7 @@ import {
   LogOut,
   Sparkles,
-  Pill
+  Pill,
+  Droplets,
+  HeartHandshake
 } from 'lucide-react';
 import { useLanguage } from '../../store/language/LanguageContext';
@@ -143,4 +145,36 @@ export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
         </NavLink>
 
+        {/* Blood requests (Blood Bank) */}
+        <NavLink
+          to="/blood-requests"
+          onClick={onClose}
+          className={({ isActive }) =>
+            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
+              isActive
+                ? 'bg-rose-50 text-rose-700 shadow-xs ring-1 ring-rose-200'
+                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
+            }`
+          }
+        >
+          <Droplets className="w-4 h-4 shrink-0" />
+          <span>{t('Blood Requests')}</span>
+        </NavLink>
+
+        {/* Donate blood (Blood Bank) */}
+        <NavLink
+          to="/donate-blood"
+          onClick={onClose}
+          className={({ isActive }) =>
+            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold ${
+              isActive
+                ? 'bg-rose-50 text-rose-700 shadow-xs ring-1 ring-rose-200'
+                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
+            }`
+          }
+        >
+          <HeartHandshake className="w-4 h-4 shrink-0" />
+          <span>{t('Donate Blood')}</span>
+        </NavLink>
+
         {/* 5. Ratings & Reviews */}
         <NavLink
```

#### patient — `src/presentation/modules/booking/UniversalBookingScreen.tsx`

```diff
@@ -1,4 +1,4 @@
 import React, { useState, useEffect, useCallback, useMemo } from 'react';
-import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
+import { useSearchParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
 import {
   ArrowLeft, Building2, MapPin, Users, Calendar, Clock, CheckCircle2,
@@ -487,4 +487,7 @@ export default function UniversalBookingScreen() {
   };
 
+  // Blood Bank has its own screen (Find Blood).
+  if (!appointmentEnabled && serviceId === 'bloodbank') return <Navigate to="/find-blood" replace />;
+
   // ---- Honest gate for non-appointment services ----
   if (!appointmentEnabled) {
```

#### patient — `src/presentation/modules/dashboard/PatientDashboard.tsx`

```diff
@@ -207,5 +207,5 @@ export default function PatientDashboard() {
               <div
                 key={service.id}
-                onClick={() => navigate(service.id === 'pharmacy' ? '/pharmacy-orders/new' : `/booking?service=${service.id}`)}
+                onClick={() => navigate(service.id === 'pharmacy' ? '/pharmacy-orders/new' : service.id === 'bloodbank' ? '/find-blood' : `/booking?service=${service.id}`)}
                 className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
               >
```

#### patient — `src/presentation/modules/notifications/NotificationsScreen.tsx`

```diff
@@ -20,4 +20,7 @@ const destination = (category: string, targetId?: string): string | null => {
   const c = (category || '').toLowerCase();
   if (c.includes('support')) return targetId ? `/help?ticket=${encodeURIComponent(targetId)}` : '/help';
+  // Blood Bank
+  if (c === 'bloodbank_donor') return '/donate-blood';
+  if (c === 'bloodbank_request') return targetId ? `/blood-requests?open=${encodeURIComponent(targetId)}` : '/blood-requests';
   if (c.includes('record') || c.includes('prescription')) return '/my-records';
   if (c.includes('pharmacy') || c.includes('order')) return '/pharmacy-orders';
```

#### patient — `src/presentation/modules/services/HealthcareServicesScreen.tsx`

```diff
@@ -3,5 +3,5 @@ import { useNavigate, useSearchParams } from 'react-router-dom';
 import {
   Search, ChevronRight, Stethoscope, Building2, Home, Truck, Pill, Microscope,
-  Accessibility, AlertCircle, RotateCcw, ArrowRight, Star, X
+  Accessibility, AlertCircle, RotateCcw, ArrowRight, Star, X, Droplets
 } from 'lucide-react';
 import { SERVICE_TILES } from '../../../config/serviceTypes';
@@ -10,5 +10,5 @@ import type { ProviderItem } from '../../../services/types';
 
 const ICON_MAP: Record<string, React.ElementType> = {
-  Stethoscope, Building2, Home, Truck, Pill, TestTube: Microscope, Package: Accessibility, Microscope, Accessibility
+  Stethoscope, Building2, Home, Truck, Pill, TestTube: Microscope, Package: Accessibility, Microscope, Accessibility, Droplets
 };
 
@@ -173,9 +173,9 @@ export default function HealthcareServicesScreen() {
                         onClick={(e) => {
                           e.stopPropagation();
-                          navigate(service.id === 'pharmacy' ? '/pharmacy-orders/new' : `/booking?service=${service.id}`);
+                          navigate(service.id === 'pharmacy' ? '/pharmacy-orders/new' : service.id === 'bloodbank' ? '/find-blood' : `/booking?service=${service.id}`);
                         }}
                         className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-600 hover:text-white px-3 py-1.5 rounded-xl border border-teal-100 transition-colors flex items-center gap-1 shadow-xs"
                       >
-                        {service.id === 'pharmacy' ? 'Order Now' : 'Book Now'} &rarr;
+                        {service.id === 'pharmacy' ? 'Order Now' : service.id === 'bloodbank' ? 'Check availability' : 'Book Now'} &rarr;
                       </button>
                     ) : (
```
