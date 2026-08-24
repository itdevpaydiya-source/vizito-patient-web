const { chromium } = require('playwright');

async function testLogout() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Log in
  await page.goto('http://localhost:5174/auth/login');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  // Switch to Email + Pass
  await page.locator('button:has-text("Email + Pass")').click();
  await page.locator('input[type="email"]').fill('pw_patient_test@vizito.test');
  await page.locator('input[type="password"]').fill('Password123!');
  // Wait, let's create a fixture or login
  // Let's set token & user directly in localStorage to test UI logout
  await page.evaluate(() => {
    localStorage.setItem('vizito_user', JSON.stringify({ patient_id: 'test-patient-id', fullName: 'Sarah Connor', role: 'patient' }));
    localStorage.setItem('vizito_token', 'eyJhbGciOiJIUzI1NiJ9.test');
  });
  await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle' });

  // Locate avatar and click
  const avatar = page.locator('header div.cursor-pointer').first();
  console.log('Avatar count in header:', await avatar.count());
  await avatar.click();
  await page.waitForTimeout(500);

  const signout = page.locator('text="Sign Out", button:has-text("Sign Out")').first();
  console.log('Sign Out button count:', await signout.count(), 'visible:', await signout.isVisible());
  if (await signout.isVisible()) {
    await signout.click();
    await page.waitForTimeout(1000);
    console.log('URL after logout:', page.url());
    const userInStorage = await page.evaluate(() => localStorage.getItem('vizito_user'));
    console.log('User in localStorage after logout:', userInStorage);
  }

  await browser.close();
}

testLogout().catch(console.error);
