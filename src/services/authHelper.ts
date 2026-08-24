import { ENDPOINTS } from "./endpoints";
import apiClient from "./index";

export interface PatientRegisterPayload {
  full_name: string;
  phone: string;
  email?: string;
  password: string;
  // Backend-issued proof that the phone/email was OTP-verified (from registerVerifyOtpApi).
  registration_token: string;
  address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
    is_default: boolean;
  };
}

// NEW-patient registration Step 1: request a registration OTP for a not-yet-registered phone/email.
export const registerSendOtpApi = async (identifier: string, type: 'mobile' | 'email') => {
  const payload = type === 'mobile' ? { phone: identifier } : { email: identifier };
  const response = await apiClient.post(ENDPOINTS.PATIENT_AUTH.REGISTER_SEND_OTP, payload);
  return response.data;
};

// NEW-patient registration Step 2: verify the OTP; returns a short-lived registration_token.
export const registerVerifyOtpApi = async (identifier: string, otp: string, type: 'mobile' | 'email') => {
  const payload = type === 'mobile' ? { phone: identifier, otp } : { email: identifier, otp };
  const response = await apiClient.post(ENDPOINTS.PATIENT_AUTH.REGISTER_VERIFY_OTP, payload);
  return response.data;
};

export interface PatientLoginPayload {
  email?: string;
  phone?: string;
  password: string;
}

// Registers a patient against the real backend. A backend failure throws the real error —
// there is intentionally NO fake/success fallback.
export const registerPatientApi = async (payload: PatientRegisterPayload) => {
  const response = await apiClient.post(ENDPOINTS.PATIENT_AUTH.REGISTER, payload);
  return response.data;
};

// Logs a patient in with email/phone + password. No fake fallback.
export const loginPatientApi = async (payload: PatientLoginPayload) => {
  const response = await apiClient.post(ENDPOINTS.PATIENT_AUTH.LOGIN, payload);
  return response.data;
};

// Google patient sign-in — points at the patient route (backend Google flow unchanged).
export const googlePatientApi = async (idToken: string) => {
  const response = await apiClient.post(ENDPOINTS.PATIENT_AUTH.GOOGLE, { idToken });
  return response.data;
};

// Requests a login OTP for an existing patient. No fake fallback.
export const sendOtpApi = async (identifier: string, type: 'mobile' | 'email') => {
  const payload = type === 'mobile' ? { phone: identifier } : { email: identifier };
  const response = await apiClient.post(ENDPOINTS.PATIENT_AUTH.SEND_OTP, payload);
  return response.data;
};

// Verifies a login OTP and returns the real auth response (tokens). No fake fallback.
export const verifyOtpApi = async (identifier: string, otp: string, type: 'mobile' | 'email') => {
  const payload = type === 'mobile' ? { phone: identifier, otp } : { email: identifier, otp };
  const response = await apiClient.post(ENDPOINTS.PATIENT_AUTH.VERIFY_OTP, payload);
  return response.data;
};
