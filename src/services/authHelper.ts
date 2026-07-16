import { ENDPOINTS } from "./endpoints";
import apiClient from "./index";

export const PROVIDER_TYPE_MAP: Record<string, number> ={
    superAdmin:1,
    admin:2,
    hospitalAdmin:3,
    clinicOwner:4,
    doctor:5,
    pharmacy:6,
    diagnostic:7,
    homecare:8,
    ambulance:9,
    equipment:10
}

export interface RegisterProviderPayload {
  full_name: string;
  phone: string;
  email: string;
  date_of_birth: string;
  gender: string;
  provider_type_id: number;
  password?: string;
  medicalRegNo?: string;
  qualification?: string;
  specialization?: string;
  experience?: number;
  superSpecialization?: string;
  languagesKnown?: string;
  hospitalName?: string;
  hospitalRegNo?: string;
  authorizedPersonName?: string;
  clinicName?: string;
  clinicRegNo?: string;
  pharmacyName?: string;
  drugLicenseNo?: string;
  laboratoryName?: string;
  laboratoryRegNo?: string;
  organizationName?: string;
}


export const registerProviderApi = async(payload: RegisterProviderPayload) =>{
    const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, payload);
    return response.data;
}

export interface LoginPayload {
  email: string;
  password?: string;
}

export const loginApi = async (payload: LoginPayload) => {
  const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, payload);
  return response.data;
};