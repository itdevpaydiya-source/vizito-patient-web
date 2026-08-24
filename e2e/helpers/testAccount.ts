import type { APIRequestContext, Page } from '@playwright/test';

export interface TestPatient {
  fullName: string;
  mobile: string;
  email: string;
  password: string;
  patientId: string;
  token: string;
}

// Registers a real, unique patient directly via the actual OTP-based registration API
// (bypassing the multi-step UI, which is a separate concern from booking) — mirrors the
// createTestAccount() pattern already established in vizito-partner-main/e2e/helpers.
// Uses the backend's dev_otp bypass (no real SMS provider is wired in yet) the same way
// the rest of this session's live testing has throughout.
export async function createTestPatient(request: APIRequestContext): Promise<TestPatient> {
  const unique = Date.now() + Math.floor(Math.random() * 1000);
  const mobile = `7${String(unique).slice(-9)}`;
  const email = `pw-patient-${unique}@vizito.test`;
  const fullName = 'Playwright Fixture Patient';
  const password = 'PlaywrightTest123!';

  const sendOtpRes = await request.post('http://localhost:3000/patient/auth/register/send-otp', {
    data: { phone: mobile },
  });
  if (!sendOtpRes.ok()) {
    throw new Error(`send-otp failed: ${sendOtpRes.status()} ${await sendOtpRes.text()}`);
  }
  const { dev_otp } = await sendOtpRes.json();
  if (!dev_otp) throw new Error('No dev_otp returned — is the backend still in dev mode?');

  const verifyRes = await request.post('http://localhost:3000/patient/auth/register/verify-otp', {
    data: { phone: mobile, otp: dev_otp },
  });
  if (!verifyRes.ok()) {
    throw new Error(`verify-otp failed: ${verifyRes.status()} ${await verifyRes.text()}`);
  }
  const { registration_token } = await verifyRes.json();

  const registerRes = await request.post('http://localhost:3000/patient/auth/register', {
    data: { full_name: fullName, phone: mobile, email, password, registration_token },
  });
  if (!registerRes.ok()) {
    throw new Error(`register failed: ${registerRes.status()} ${await registerRes.text()}`);
  }
  const body = await registerRes.json();

  return {
    fullName,
    mobile,
    email,
    password,
    patientId: body.patient_id,
    token: body.access_token || body.token || body.data?.access_token,
  };
}

// Seeds the browser session directly — matches the EXACT localStorage shape AppNavigator.tsx's
// LoginWrapper/RegisterWrapper writes on a real login (patient_id/email/mobile/role/fullName/
// token under 'vizito_user', plus a standalone 'vizito_token'). Used so specs about a specific
// screen (booking) don't have to also drive the login UI, which is a separate concern.
export async function loginAsTestPatient(page: Page, patient: TestPatient): Promise<void> {
  await page.goto('/auth/login');
  await page.evaluate((p) => {
    localStorage.setItem('vizito_user', JSON.stringify({
      patient_id: p.patientId,
      email: p.email,
      mobile: p.mobile,
      role: 'patient',
      fullName: p.fullName,
      token: p.token,
    }));
    localStorage.setItem('vizito_token', p.token);
  }, patient);
  await page.goto('/dashboard');
}
