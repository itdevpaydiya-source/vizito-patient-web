export const ENDPOINTS = {
    // Patient-specific authentication routes (proxied via gateway -> vizito-auth patient module).
    PATIENT_AUTH: {
        REGISTER: '/patient/auth/register',
        REGISTER_SEND_OTP: '/patient/auth/register/send-otp',
        REGISTER_VERIFY_OTP: '/patient/auth/register/verify-otp',
        LOGIN: '/patient/auth/login',
        GOOGLE: '/patient/auth/google',
        SEND_OTP: '/patient/auth/send-otp',
        VERIFY_OTP: '/patient/auth/verify-otp',
        REFRESH: '/patient/auth/refresh-token',
        PROFILE: '/patient/auth/profile',
    },
    // Authenticated patient data (proxied via gateway -> vizito-auth). Identity is derived from the
    // JWT server-side; the frontend never sends a patient_id.
    PATIENTS: {
        ME: '/patients/me',
        PROFILE: '/patients/profile',
        CHANGE_PASSWORD: '/patients/change-password',
        PROVIDERS: '/patients/providers',
        AVAILABLE_DOCTORS: '/patients/available-doctors',
        DASHBOARD: '/patients/dashboard',
        FAVORITES: '/patients/favorites',
        ADDRESS: '/patients/address',
        BOOKINGS: '/patients/bookings',
        PRESCRIPTIONS: '/patients/prescriptions',
        REVIEWS: '/patients/reviews',
        PROVIDER_REVIEWS: (partnerId: string) => `/patients/providers/${partnerId}/reviews`,
        // Online-appointment discovery chain (all patient-scoped via JWT).
        PROVIDER_DETAIL: (partnerId: string) => `/patients/providers/${partnerId}/detail`,
        PROVIDER_BRANCHES: (partnerId: string) => `/patients/providers/${partnerId}/branches`,
        BRANCH_DEPARTMENTS: (partnerId: string, facilityId: number | string) => `/patients/providers/${partnerId}/branches/${facilityId}/departments`,
        BRANCH_DOCTORS: (facilityId: number | string) => `/patients/branches/${facilityId}/doctors`,
        PROVIDER_SLOTS: (partnerId: string) => `/patients/providers/${partnerId}/slots`,
    },
    // Called directly through the gateway to vizito-booking (not proxied via vizito-auth like
    // PATIENTS.* above) — the gateway forwards the patient's own JWT identity as x-user either way,
    // and PaymentsController enforces booking ownership server-side from that, so a direct call is
    // just as safe and avoids adding a pass-through wrapper for a single endpoint.
    BOOKINGS: {
        PAYMENT: (bookingId: string) => `/bookings/${bookingId}/payment`,
    },
    // In-app notifications (proxied via gateway -> vizito-booking). Recipient is derived from the
    // JWT server-side (the patient's users.id); the frontend never sends a recipient id.
    NOTIFICATIONS: {
        BASE: '/notifications',
        READ_ALL: '/notifications/read-all',
        READ_ONE: (id: string) => `/notifications/${id}/read`,
        DELETE_ONE: (id: string) => `/notifications/${id}`,
    },
    // Family members are owned by the authenticated user. The backend enforces assertSelf: the
    // :userId in the path MUST equal the JWT user, so the frontend passes its own users.id
    // (resolved from /patients/me), never an arbitrary id.
    FAMILY: {
        base: (userId: number | string) => `/users/${userId}/family-members`,
        association: (userId: number | string, associationId: string) =>
            `/users/${userId}/family-members/association/${associationId}`,
    },
};
