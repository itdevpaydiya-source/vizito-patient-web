const { chromium } = require('playwright');
const path = require('path');
const mysql = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/mysql2/promise'));
const bcrypt = require(path.join(__dirname, '../../vizito-replica-backend/vizito-auth/node_modules/bcryptjs'));

async function debugAuth3() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('response', async res => {
    if (res.url().includes('patient/auth')) {
      try {
        console.log(`API [${res.status()}] ${res.url()}:`, await res.text());
      } catch (e) {}
    }
  });

  const regUnique = Date.now().toString().slice(-8);
  const regPhone = `88${regUnique}`;
  console.log('Testing reg with phone:', regPhone);

  await page.goto('http://localhost:5174/auth/register', { waitUntil: 'networkidle' });
  const phoneInput = page.locator('input[type="tel"]').first();
  await phoneInput.fill(regPhone);

  const sendOtpBtn = page.locator('button:has-text("Send Verification OTP")').first();
  await sendOtpBtn.click();
  await page.waitForTimeout(1000);

  const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'root', database: 'vizito_auth' });
  const [rows] = await conn.execute('SELECT * FROM registration_otps WHERE identifier = ? ORDER BY created_at DESC LIMIT 1', [regPhone]);
  console.log('DB registration_otps row:', rows[0]);

  const testOtp = '123456';
  const testOtpHash = await bcrypt.hash(testOtp, 10);
  await conn.execute('UPDATE registration_otps SET otp_hash = ? WHERE identifier = ? ORDER BY created_at DESC LIMIT 1', [testOtpHash, regPhone]);
  await conn.end();

  const otpInput = page.locator('input[maxlength="6"], input[placeholder*="OTP" i]').first();
  await otpInput.fill(testOtp);

  const verifyOtpBtn = page.locator('button:has-text("Verify OTP")').first();
  await verifyOtpBtn.click();

  await page.waitForTimeout(2000);
  console.log('Current error text:', await page.locator('.bg-rose-50, text=/error|invalid|failed/i').allInnerTexts());
  console.log('Current success text:', await page.locator('.bg-emerald-50').allInnerTexts());
  console.log('Current Step visible texts:', await page.locator('h2').allInnerTexts());

  await browser.close();
}

debugAuth3().catch(console.error);
