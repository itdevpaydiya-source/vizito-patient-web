const { chromium } = require('playwright');

async function testNavAndLogout() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log('--- Testing NAV-003 ---');
  // First, set up authenticated session cleanly
  await page.goto('http://localhost:5174/auth/login');
  await page.evaluate(() => {
    localStorage.setItem('vizito_user', JSON.stringify({ patient_id: 'test-patient-id', fullName: 'Sarah Connor', role: 'patient' }));
    localStorage.setItem('vizito_token', 'test-token');
  });

  // Navigate: Dashboard -> Services -> Records
  await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle' });
  // Click navigation link to Services so it's in React Router / browser history
  const servicesLink = page.locator('a[href="/services"], a[href="/healthcare-services"], button:has-text("Services")').first();
  if (await servicesLink.isVisible()) {
    await servicesLink.click();
    await page.waitForTimeout(500);
  } else {
    await page.goto('http://localhost:5174/services', { waitUntil: 'networkidle' });
  }

  // Navigate to Records
  const recordsLink = page.locator('a[href="/my-records"], a[href="/records"], button:has-text("Records")').first();
  if (await recordsLink.isVisible()) {
    await recordsLink.click();
    await page.waitForTimeout(500);
  } else {
    await page.goto('http://localhost:5174/my-records', { waitUntil: 'networkidle' });
  }

  console.log('Current URL at C:', page.url());
  await page.goBack();
  await page.waitForTimeout(500);
  console.log('URL after 1st goBack (B):', page.url());

  await page.goBack();
  await page.waitForTimeout(500);
  console.log('URL after 2nd goBack (A):', page.url());

  const authUserAfterBack = await page.evaluate(() => localStorage.getItem('vizito_user'));
  console.log('Auth user still present:', !!authUserAfterBack);

  console.log('\n--- Testing AUTH-007 (Logout) ---');
  // Trigger profile dropdown
  const profileTrigger = page.locator('header div.cursor-pointer').first();
  console.log('Profile trigger count:', await profileTrigger.count());
  if (await profileTrigger.isVisible()) {
    await profileTrigger.click();
    await page.waitForTimeout(300);
    const signoutBtn = page.locator('button:has-text("Sign Out")').first();
    console.log('Signout btn visible:', await signoutBtn.isVisible());
    if (await signoutBtn.isVisible()) {
      await signoutBtn.click();
      await page.waitForTimeout(1000);
      console.log('URL after signout click:', page.url());
      const userAfter = await page.evaluate(() => localStorage.getItem('vizito_user'));
      console.log('User cleared from storage:', !userAfter);
    }
  }

  await browser.close();
}

testNavAndLogout().catch(console.error);
