import { test, expect, type Page } from '@playwright/test';

// Re-check of the tester's report (29 Sep 2026, "patient" sheet) with her own steps and data.
test.describe.configure({ timeout: 180000 });
const API = 'http://localhost:3000';

async function toPersonalInfo(page: Page) {
  const mobile = `9${String(Date.now()).slice(-9)}`;
  await page.goto('/auth/register');
  await page.getByPlaceholder('10-digit mobile number').fill(mobile);
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/patient/auth/register/send-otp')),
    page.getByRole('button', { name: /Send Verification OTP/ }).click(),
  ]);
  const otp = (await res.json()).dev_otp;
  await page.getByPlaceholder('e.g. 123456').fill(otp);
  await page.getByRole('button', { name: /Verify OTP/ }).click();
  await expect(page.getByPlaceholder('e.g. Sarah Connor')).toBeVisible({ timeout: 15000 });
  return mobile;
}

test('patient TC-02: an 8-digit mobile cannot get an OTP', async ({ page, request }) => {
  const r = await request.post(`${API}/patient/auth/register/send-otp`, { data: { phone: '54323432' } });
  expect(r.status()).toBe(400);
  await page.goto('/auth/register');
  const mobile = page.getByPlaceholder('10-digit mobile number');
  await mobile.fill('54323432');
  await expect(mobile).not.toHaveValue(/^54323432$/);             // numbers starting 1-5 are refused as typed
  await page.getByRole('button', { name: /Send Verification OTP/ }).click();
  await expect(page.getByPlaceholder('e.g. 123456')).toHaveCount(0);
});

test('patient TC-04..13: personal info and address refuse junk, list every problem, and have both eye icons', async ({ page }) => {
  await toPersonalInfo(page);
  const name = page.getByPlaceholder('e.g. Sarah Connor');
  await name.fill('w23e4565432');                                 // TC-04
  await expect(name).toHaveValue('we');
  await name.fill('@@##$$');                                      // TC-06
  await expect(name).toHaveValue('');

  // TC-08: everything blank -> all problems together.
  await page.getByRole('button', { name: 'Proceed to Address Information' }).click();
  await expect(page.getByText('Enter the name as on the ID.')).toBeVisible();
  await expect(page.getByText('Create a password.')).toBeVisible();
  await expect(page.getByText('Re-enter the password to confirm it.')).toBeVisible();

  // TC-05: weak password refused.
  await name.fill('Leela');
  await page.getByPlaceholder('sarah@example.com').fill('leela@example.com');
  await page.getByPlaceholder('Create a strong password').fill('ewedrfty76543234567yf,');
  await page.getByPlaceholder('Re-enter password').fill('ewedrfty76543234567yf,');
  await page.getByRole('button', { name: 'Proceed to Address Information' }).click();
  await expect(page.getByText(/uppercase|capital/i).first()).toBeVisible();

  // TC-09: eye icon on Confirm Password.
  const confirm = page.getByPlaceholder('Re-enter password');
  await expect(confirm).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show confirm password' }).click();
  await expect(confirm).toHaveAttribute('type', 'text');

  // Live checklist: the missing rule stays grey, met rules turn green; confirm shows match state.
  const rules = page.getByRole('list', { name: 'Password requirements' });
  await expect(rules.getByText('An uppercase letter')).toHaveClass(/text-slate-400/);
  await expect(rules.getByText('A lowercase letter')).toHaveClass(/text-emerald-600/);
  await expect(page.getByText('Passwords match')).toBeVisible();
  await page.getByPlaceholder('Create a strong password').fill('Anjali@123');
  await expect(rules.getByText('An uppercase letter')).toHaveClass(/text-emerald-600/);
  await expect(page.getByText('Passwords do not match')).toBeVisible();
  await confirm.fill('Anjali@123');
  await expect(page.getByText('Passwords match')).toBeVisible();
  await page.getByRole('button', { name: 'Proceed to Address Information' }).click();
  await page.getByRole('button', { name: /Manual Address Entry/ }).click().catch(() => undefined);

  // TC-13: blank address -> every missing field listed together.
  await page.getByRole('button', { name: 'Proceed to Review' }).click();
  await expect(page.getByText('Enter the house / street address.')).toBeVisible();
  await expect(page.getByText('Enter the city.')).toBeVisible();
  await expect(page.getByText('Enter a 6-digit PIN code.')).toBeVisible();
  const city = page.getByPlaceholder('City');
  await city.fill('Hyder4bad!');
  await expect(city).toHaveValue('Hyderbad');
});
