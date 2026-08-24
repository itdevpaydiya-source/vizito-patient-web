# Graph Report - vizito-patient-web  (2026-08-18)

## Corpus Check
- 62 files · ~139,700 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 364 nodes · 699 edges · 20 communities (17 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.67)
- Token cost: 131,385 input · 0 output

## Community Hubs (Navigation)
- Universal Booking Flow
- Patient Dashboard & Universal Modules (FRD)
- App Layouts & Navigation
- NPM Dependencies
- Patient Dashboard & Profile Screens
- ESLint Tooling Config
- Consultations & Reviews Screens
- App Root & User Type Selection
- Vite/TS App Build Config
- Auth & Registration Modules
- Vite/TS Node Build Config
- Booking, Records & Healthcare Services Screens
- Booking E2E Tests
- Auth & Onboarding Requirements (FRD Module 1)
- Splash Screen
- Welcome Onboarding Screen
- TypeScript Config

## God Nodes (most connected - your core abstractions)
1. `Vizito Patient Application FRD` - 24 edges
2. `UniversalBookingScreen()` - 21 edges
3. `compilerOptions` - 17 edges
4. `compilerOptions` - 16 edges
5. `Module 19: Bookings` - 14 edges
6. `ProfileLayout()` - 11 edges
7. `getFamilyMembersApi()` - 10 edges
8. `Universal Booking Flow` - 10 edges
9. `Universal Provider Details` - 10 edges
10. `Universal Booking Details` - 10 edges

## Surprising Connections (you probably didn't know these)
- `index.html Entry Page (vizito-User)` --conceptually_related_to--> `Vizito Patient Application FRD`  [INFERRED]
  index.html → extracted_requirements.txt
- `goToTomorrowAndSelectDoctor()` --references--> `Page`  [EXTRACTED]
  e2e/booking.spec.ts → src/presentation/modules/booking/UniversalBookingScreen.tsx
- `loginAsTestPatient()` --references--> `Page`  [EXTRACTED]
  e2e/helpers/testAccount.ts → src/presentation/modules/booking/UniversalBookingScreen.tsx
- `LoginWrapper()` --calls--> `useRole()`  [EXTRACTED]
  src/navigation/AppNavigator.tsx → src/store/role/RoleContext.tsx
- `RegisterWrapper()` --calls--> `useRole()`  [EXTRACTED]
  src/navigation/AppNavigator.tsx → src/store/role/RoleContext.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Universal Reusable Module Family (Search, Provider Details, Booking Flow, Bookings)** — extracted_requirements_module4_universal_search, extracted_requirements_module5_universal_provider_details, extracted_requirements_module3_universal_booking_flow, extracted_requirements_module19_bookings [INFERRED 0.85]
- **Vertical Healthcare Service Modules Implementing the Universal Pattern** — extracted_requirements_module12_doctor_consultation, extracted_requirements_module13_hospital_clinic, extracted_requirements_module14_home_care_services, extracted_requirements_module15_scheduled_ambulance_services, extracted_requirements_module16_pharmacy, extracted_requirements_module17_diagnostic_laboratory, extracted_requirements_module18_medical_equipment_rental [INFERRED 0.85]
- **Patient Onboarding Flow (Login, Registration, Personal Info, Address)** — extracted_requirements_login_screen, extracted_requirements_new_user_registration, extracted_requirements_personal_information, extracted_requirements_address_information [EXTRACTED 1.00]

## Communities (20 total, 3 thin omitted)

### Community 0 - "Universal Booking Flow"
Cohesion: 0.12
Nodes (31): SERVICE_TILES, ServiceTile, initials(), PaymentMethod, UniversalBookingScreen(), upcomingDates(), AvailableSlot, Branch (+23 more)

### Community 1 - "Patient Dashboard & Universal Modules (FRD)"
Cohesion: 0.15
Nodes (35): Active Bookings, Bottom Navigation, Vizito Patient Application FRD, Family Members, Favorites, Global Search (Dashboard), Healthcare Services (Dashboard), Universal Cancellation (+27 more)

### Community 2 - "App Layouts & Navigation"
Cohesion: 0.10
Nodes (25): AuthLayout(), DashboardLayout(), MainLayout(), hasActiveSession(), LoginWrapper(), RegisterWrapper(), RootSessionGuard(), Sidebar() (+17 more)

### Community 3 - "NPM Dependencies"
Cohesion: 0.06
Nodes (32): axios, formik, localtunnel, lucide-react, dependencies, axios, formik, localtunnel (+24 more)

### Community 4 - "Patient Dashboard & Profile Screens"
Cohesion: 0.16
Nodes (28): appointmentTypeLabel(), ICON_MAP, PatientDashboard(), FamilyProfilesScreen(), ProfileLayout(), addFamilyMemberApi(), AddFamilyMemberInput, ageFromDob() (+20 more)

### Community 5 - "ESLint Tooling Config"
Cohesion: 0.07
Nodes (27): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+19 more)

### Community 6 - "Consultations & Reviews Screens"
Cohesion: 0.17
Nodes (19): appointmentTypeLabel(), DisplayBooking, MyConsultationsScreen(), statusBadgeClass(), TabKey, appointmentTypeLabel(), ReviewsScreen(), DashboardBooking (+11 more)

### Community 7 - "App Root & User Type Selection"
Cohesion: 0.14
Nodes (18): App(), AppNavigator(), UserRole, UserTypeSelectionProps, deleteNotificationApi(), getNotificationsApi(), mapNotification(), markAllNotificationsReadApi() (+10 more)

### Community 8 - "Vite/TS App Build Config"
Cohesion: 0.09
Nodes (22): DOM, src, vite/client, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib (+14 more)

### Community 9 - "Auth & Registration Modules"
Cohesion: 0.16
Nodes (19): AuthMethodOption, AuthModule(), AuthModuleProps, AuthScreenState, loadGoogleIdentity(), Window, RegistrationModule(), RegistrationModuleProps (+11 more)

### Community 10 - "Vite/TS Node Build Config"
Cohesion: 0.10
Nodes (20): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+12 more)

### Community 11 - "Booking, Records & Healthcare Services Screens"
Cohesion: 0.20
Nodes (13): BookConsultationScreen(), MyRecordsScreen(), PrescriptionPreview(), HealthcareServicesScreen(), ICON_MAP, addFavoriteApi(), getFavoritesApi(), getPrescriptionsApi() (+5 more)

### Community 12 - "Booking E2E Tests"
Cohesion: 0.29
Nodes (8): goToTomorrowAndSelectDoctor(), createTestPatient(), loginAsTestPatient(), TestPatient, activatePartner(), createTestDoctorWithAvailability(), TestDoctor, Page

### Community 13 - "Auth & Onboarding Requirements (FRD Module 1)"
Cohesion: 0.62
Nodes (7): Address Information (Registration), Authentication Methods (Mobile/Email x OTP/Password), Forgot Password, Login Screen, Module 1: Authentication & Onboarding, New User Registration, Personal Information (Registration)

## Knowledge Gaps
- **113 isolated node(s):** `TestPatient`, `name`, `private`, `version`, `type` (+108 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Page` connect `Booking E2E Tests` to `Universal Booking Flow`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `ESLint Tooling Config` to `NPM Dependencies`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `TestPatient`, `name`, `private` to the rest of the system?**
  _113 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Universal Booking Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.11746031746031746 - nodes in this community are weakly interconnected._
- **Should `Patient Dashboard & Universal Modules (FRD)` be split into smaller, more focused modules?**
  _Cohesion score 0.146218487394958 - nodes in this community are weakly interconnected._
- **Should `App Layouts & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.10252100840336134 - nodes in this community are weakly interconnected._
- **Should `NPM Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._