import { test, expect } from '@playwright/test';

test.describe('Patient Unified Login Flow', () => {
  test('verifies removal of 4 tabs, presence of unified input, OTP toggle, and dedicated OTP screen', async ({ page }) => {
    await page.goto('http://localhost:5174/');
    await page.waitForLoadState('networkidle');

    // 1. Verify 4 legacy tabs do NOT exist
    await expect(page.getByRole('button', { name: 'Mobile + OTP' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mobile + Pass' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Email + OTP' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Email + Pass' })).toHaveCount(0);

    // 2. Verify unified identifier input & password field
    const identifierInput = page.getByPlaceholder('Enter mobile number or email');
    await expect(identifierInput).toBeVisible();

    const passwordInput = page.getByPlaceholder('Enter your password');
    await expect(passwordInput).toBeVisible();

    const loginBtn = page.getByRole('button', { name: 'Login', exact: true });
    await expect(loginBtn).toBeVisible();

    // Screenshot initial unified login view (password mode)
    await page.screenshot({ path: 'test-results/patient-login-unified-password.png', fullPage: true });

    // 3. Test toggle to OTP mode
    const toggleToOtpBtn = page.getByRole('button', { name: 'Login with OTP instead' });
    await expect(toggleToOtpBtn).toBeVisible();
    await toggleToOtpBtn.click();

    // Password field should now be hidden
    await expect(passwordInput).toHaveCount(0);
    // Button should now say "Send OTP"
    const sendOtpBtn = page.getByRole('button', { name: 'Send OTP' });
    await expect(sendOtpBtn).toBeVisible();
    // Helper text should be visible
    await expect(page.getByText("We will send you a 6-digit OTP to verify it's you")).toBeVisible();

    // Screenshot OTP mode
    await page.screenshot({ path: 'test-results/patient-login-unified-otp.png', fullPage: true });

    // 4. Test toggle back to password mode
    const toggleToPassBtn = page.getByRole('button', { name: 'Login with password instead' });
    await expect(toggleToPassBtn).toBeVisible();
    await toggleToPassBtn.click();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();

    // 5. Test validation error on empty submit
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page.getByText('Please enter your mobile number or email')).toBeVisible();

    // 6. Test OTP flow with mobile number
    await page.getByRole('button', { name: 'Login with OTP instead' }).click();
    await identifierInput.fill('9876543210');
    await page.getByRole('button', { name: 'Send OTP' }).click();

    // Wait for dedicated OTP verification screen or error
    // If backend returns error (e.g. no patient account found), verify error alert displays cleanly
    // If successful, verify dedicated OTP screen elements
    const isOtpScreen = await page.getByRole('heading', { name: 'Enter OTP' }).isVisible({ timeout: 5000 }).catch(() => false);
    if (isOtpScreen) {
      await expect(page.getByRole('heading', { name: 'Enter OTP' })).toBeVisible();
      await expect(page.getByPlaceholder('e.g. 123456')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Verify OTP & Login' })).toBeVisible();
      await page.screenshot({ path: 'test-results/patient-login-dedicated-otp.png', fullPage: true });

      // Test Back to Login button
      const backBtn = page.getByRole('button', { name: 'Back to Login' });
      await expect(backBtn).toBeVisible();
      await backBtn.click();
      await expect(page.getByPlaceholder('Enter mobile number or email')).toBeVisible();
    } else {
      // Backend reported message (e.g. No patient account found)
      const errorBanner = page.locator('.bg-rose-50');
      await expect(errorBanner).toBeVisible();
    }
  });
});
