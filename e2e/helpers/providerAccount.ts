import type { APIRequestContext } from '@playwright/test';

// Person names may not contain digits, so uniqueness suffixes are spelled as letters.
export function lettersFor(n: number): string {
  return String(n).replace(/\d/g, (d) => 'abcdefghij'[Number(d)]);
}

// Sign-up requires each business type's legal essentials (server-enforced). Specs that don't care
// about them get realistic defaults; anything a spec passes explicitly wins.
function essentialsFor(data: Record<string, unknown>): Record<string, unknown> {
  const tag = String(data.phone).slice(-6);
  switch (Number(data.provider_type_id)) {
    case 5: return { medicalRegNo: `TSMC-${tag}`, qualification: 'MBBS', specialization: 'General Medicine', experience: 5 };
    case 3: return { hospitalName: `${data.full_name} Hospital`, hospitalRegNo: `HOSP-${tag}` };
    case 4: return { clinicName: `${data.full_name} Clinic`, clinicRegNo: `CLN-${tag}` };
    case 6: return { pharmacyName: `${data.full_name} Pharmacy`, drugLicenseNo: `DL-TS-${tag}` };
    default: return {};
  }
}

// Provider sign-up needs a verified mobile: send-otp -> verify-otp (dev_otp is returned outside
// production) -> POST /auth/register with the registration_token. Returns the /auth/register body.
export async function registerProviderAccount(
  request: APIRequestContext,
  apiUrl: string,
  data: Record<string, unknown> & { phone: string; provider_type_id: number; email: string },
): Promise<any> {
  const sendRes = await request.post(`${apiUrl}/auth/register/send-otp`, {
    data: { phone: data.phone, provider_type_id: data.provider_type_id, email: data.email },
  });
  if (!sendRes.ok()) throw new Error(`provider send-otp failed: ${sendRes.status()} ${await sendRes.text()}`);
  const { dev_otp } = await sendRes.json();
  const verifyRes = await request.post(`${apiUrl}/auth/register/verify-otp`, { data: { phone: data.phone, otp: dev_otp } });
  if (!verifyRes.ok()) throw new Error(`provider verify-otp failed: ${verifyRes.status()} ${await verifyRes.text()}`);
  const { registration_token } = await verifyRes.json();
  const regRes = await request.post(`${apiUrl}/auth/register`, { data: { ...essentialsFor(data), ...data, registration_token } });
  if (!regRes.ok()) throw new Error(`provider register(${data.email}) failed: ${regRes.status()} ${await regRes.text()}`);
  return regRes.json();
}
