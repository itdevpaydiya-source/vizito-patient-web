import { createBookingsFixture } from './helpers/bookingScreenFixtures';
import { createTestDoctorWithAvailability } from './helpers/testDoctor';
import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';
const API = 'http://localhost:3000',
  shots = 'artifacts/bookings-reference';
test.describe.configure({ timeout: 420000 });
test.use({ actionTimeout: 60000 });
test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(60000);
});
const localDate = (offset: number) =>
  new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  });
async function body(response: any) {
  expect(response.ok(), `${response.status()} ${await response.text()}`).toBe(
    true,
  );
  return response.json();
}
async function settled(page: Page) {
  await expect(
    page.getByRole('region', { name: 'Loading bookings', exact: true }),
  ).toHaveCount(0, { timeout: 70000 });
  await expect(
    page.getByRole('heading', { name: 'Unable to load bookings', exact: true }),
  ).toHaveCount(0);
}

test('real booking list, filters, panels, calendar and doctor/lab/home-care mutations', async ({
  page,
  request,
}) => {
  await mkdir(shots, { recursive: true });
  const {patient,headers,get,post,booking,labOrder,careOrder,carePermissions,doctorSlots,doctorDate} = await createBookingsFixture(request);
  console.log(
    'LIVE_FIXTURES',
    JSON.stringify({
      doctor: booking.booking_number,
      lab: labOrder.order_number,
      care: careOrder.order_number,
    }),
  );
  await loginAsTestPatient(page, patient);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/my-consultations');
  await settled(page);
  await expect(page.getByRole('article')).toHaveCount(3);
  await page.screenshot({ path: `${shots}/desktop-1440.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.locator('aside').evaluate((el) => el.getBoundingClientRect().right),
    )
    .toBeLessThanOrEqual(0);
  await expect
    .poll(() =>
      page.locator('main').evaluate((el) => el.scrollWidth <= el.clientWidth),
    )
    .toBe(true);
  await page.screenshot({ path: `${shots}/mobile-390.png` });
  await page.setViewportSize({ width: 1440, height: 1000 });

  for (const [label, count] of [
    ['All', 3],
    ['Upcoming', 3],
    ['Completed', 0],
    ['Cancelled', 0],
  ] as const) {
    const button = page.getByRole('button', {
      name: `${label} (${count})`,
      exact: true,
    });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('article')).toHaveCount(
      label === 'All' || label === 'Upcoming' ? 3 : 0,
    );
  }
  await page.getByRole('button', { name: 'All (3)', exact: true }).click();
  const row = page
    .locator(`[data-booking-id]`)
    .filter({ hasText: 'Lab Tests' })
    .first();
  await row.getByRole('button', { name: /View details for/ }).click();
  const detail = page.getByRole('dialog', {
    name: 'Booking details',
    exact: true,
  });
  await detail.getByRole('button', { name: 'Booking options', exact: true }).click();
  await expect(
    detail.getByRole('button', { name: 'Add to calendar', exact: true }),
  ).toBeEnabled();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await detail.getByRole('button', { name: 'Booking options', exact: true }).click();
  await expect(
    detail.getByRole('button', { name: 'Add to calendar', exact: true }),
  ).toBeEnabled({ timeout: 70000 });
  await detail.screenshot({ path: `${shots}/details.png` });
  const download = page.waitForEvent('download');
  await detail
    .getByRole('button', { name: 'Add to calendar', exact: true })
    .click();
  const ics = await download;
  await ics.saveAs(`${shots}/booking.ics`);
  const text = await readFile(`${shots}/booking.ics`, 'utf8');
  expect(text).toContain('BEGIN:VEVENT');
  expect(text).toContain(
    `UID:${await row.getAttribute('data-booking-id')}@vizito`,
  );
  expect(text).toContain(labOrder.order_number);
  expect(text).not.toContain('DTEND:');
  await detail
    .getByRole('button', { name: 'Back to bookings', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Filter bookings', exact: true })
    .click();
  const filter = page.getByRole('dialog', {
    name: 'Filter bookings',
    exact: true,
  });
  await filter.screenshot({ path: `${shots}/filters.png` });
  await filter.getByLabel('From date', { exact: true }).fill(doctorDate);
  await filter.getByLabel('To date', { exact: true }).fill(doctorDate);
  await filter.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Filter bookings', exact: true })
    .click();
  await filter.getByRole('button', { name: 'Clear', exact: true }).click();
  await filter.getByRole('button', { name: 'Doctor', exact: true }).click();
  await filter.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Filter bookings', exact: true })
    .click();
  await filter.getByRole('button', { name: 'Clear', exact: true }).click();
  await filter.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(3);
  await page
    .getByRole('textbox', { name: 'Search bookings', exact: true })
    .fill(labOrder.order_number);
  await expect(page.getByRole('article')).toHaveCount(1);
  await page
    .getByRole('textbox', { name: 'Search bookings', exact: true })
    .fill('no matching booking');
  await expect(page.getByRole('article')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Clear booking search', exact: true })
    .click();
  const doctorDetailsRow = page.locator(`[data-booking-id="${booking.id}"]`);
  await doctorDetailsRow
    .getByRole('button', { name: /View details for/ })
    .click();
  await detail.getByRole('button', { name: 'Booking options', exact: true }).click();
  await expect(
    detail.getByRole('button', { name: 'Add to calendar', exact: true }),
  ).toBeEnabled();
  await detail.screenshot({ path: `${shots}/details-doctor.png` });
  await detail
    .getByRole('button', { name: 'Back to bookings', exact: true })
    .click();
  // Move and cancel the doctor using its real slot API.
  const doctorRow = page.locator(`[data-booking-id="${booking.id}"]`);
  await doctorRow
    .getByRole('button', { name: 'Reschedule', exact: true })
    .click();
  const doctorMove = detail.getByRole('group', {
    name: 'Reschedule this visit',
    exact: true,
  });
  const doctorDay = new Date(`${doctorDate}T12:00:00`).toLocaleDateString(
    'en-IN',
    { weekday: 'short', day: '2-digit', month: 'short' },
  );
  await doctorMove.getByRole('radio', { name: doctorDay, exact: true }).click();
  const h = Number(String(doctorSlots![1].start_time).slice(0, 2)),
    m = String(doctorSlots![1].start_time).slice(3, 5),
    slotLabel = `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
  await doctorMove.getByRole('radio', { name: slotLabel, exact: true }).click();
  const doctorMoved = page.waitForResponse(
    (r) =>
      r.url().includes(`/bookings/patient/${booking.id}/reschedule`) &&
      r.request().method() === 'POST',
  );
  await doctorMove.getByRole('button', { name: /Move to/ }).click();
  expect((await doctorMoved).ok()).toBe(true);
  await expect(detail).toHaveCount(0, { timeout: 70000 });
  await settled(page);
  await expect(page.getByRole('status')).toContainText('moved to');
  // Use the returned home-care visit id, and verify the real range in its calendar file.
  const careRow = page
    .getByRole('article')
    .filter({ hasText: careOrder.service_name });
  await careRow.getByRole('button', { name: /View details for/ }).click();
  await detail.getByRole('button', { name: 'Booking options', exact: true }).click();
  await expect(
    detail.getByRole('button', { name: 'Add to calendar', exact: true }),
  ).toBeEnabled();
  const careDownload = page.waitForEvent('download');
  await detail
    .getByRole('button', { name: 'Add to calendar', exact: true })
    .click();
  await (await careDownload).saveAs(`${shots}/home-care.ics`);
  expect(await readFile(`${shots}/home-care.ics`, 'utf8')).toContain('DTEND:');
  await detail.getByRole('button', { name: 'Reschedule', exact: true }).click();
  const careMove = detail.getByRole('group', {
    name: 'Reschedule home care',
    exact: true,
  });
  await careMove
    .getByLabel('New home care date', { exact: true })
    .fill(localDate(4));
  const careMoved = page.waitForResponse(
    (r) =>
      r
        .url()
        .includes(
          `/home-care/visits/${carePermissions.reschedule_visit_id}/reschedule`,
        ) && r.request().method() === 'POST',
  );
  await careMove
    .getByRole('button', { name: 'Confirm reschedule', exact: true })
    .click();
  expect((await careMoved).ok()).toBe(true);
  await expect(detail).toHaveCount(0, { timeout: 70000 });
  await settled(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.locator('aside').evaluate((el) => el.getBoundingClientRect().right),
    )
    .toBeLessThanOrEqual(0);
  await expect
    .poll(() =>
      page.locator('main').evaluate((el) => el.scrollWidth <= el.clientWidth),
    )
    .toBe(true);
  await page.screenshot({ path: `${shots}/mobile-390.png` });
  await row.getByRole('button', { name: /View details for/ }).click();
  await detail.getByRole('button', { name: 'Reschedule', exact: true }).click();
  const move = detail.getByRole('group', {
    name: 'Reschedule lab booking',
    exact: true,
  });
  await expect(
    move.getByRole('group', { name: 'Visit time', exact: true }),
  ).toBeVisible({timeout:60000});
  await move
    .getByRole('group', { name: 'Visit time', exact: true })
    .locator('button:not([disabled])')
    .first()
    .click();
  const moved = page.waitForResponse(
    (r) =>
      r.url().includes(`/lab-orders/${labOrder.id}/reschedule`) &&
      r.request().method() === 'POST',
  );
  await move
    .getByRole('button', { name: 'Confirm reschedule', exact: true })
    .click();
  expect((await moved).ok()).toBe(true);
  await settled(page);
  await expect(page.getByRole('status')).toContainText('Moved to');
  await row.getByRole('button', { name: /View details for/ }).click();
  await detail.getByRole('button', { name: 'Cancel', exact: true }).click();
  const cancel = detail.getByRole('group', {
    name: 'Cancel this booking',
    exact: true,
  });
  await cancel
    .getByRole('radio', { name: 'Booked by mistake', exact: true })
    .click();
  await cancel
    .getByRole('button', { name: 'Yes, cancel booking', exact: true })
    .click();
  await expect(page.locator('.bk-notice')).toContainText('is cancelled');
  await settled(page);
  await row.getByRole('button', { name: /View details for/ }).click();
  await expect(
    detail.getByRole('button', { name: 'Reschedule', exact: true }),
  ).toHaveCount(0);
  await expect(
    detail.getByRole('button', { name: 'Cancel', exact: true }),
  ).toHaveCount(0);
  await expect(detail).toContainText('cancelled');
  await detail
    .getByRole('button', { name: 'Back to bookings', exact: true })
    .click();
  for (const number of [booking.booking_number, careOrder.order_number]) {
    await page.getByRole('button', { name: 'All (3)', exact: true }).click();
    const target = page.getByRole('button', {
      name: `View details for ${number}`,
      exact: true,
    });
    await target.click();
    await detail.getByRole('button', { name: 'Cancel', exact: true }).click();
    const cancelPanel = detail.getByRole('group', {
      name: 'Cancel this booking',
      exact: true,
    });
    await expect(cancelPanel.locator('p')).not.toBeEmpty();
    await cancelPanel
      .getByRole('button', { name: 'Yes, cancel booking', exact: true })
      .click();
    await expect(detail.getByRole('alert')).toHaveText('Choose a reason.');
    await cancelPanel
      .getByRole('radio', { name: 'Booked by mistake', exact: true })
      .click();
    await cancelPanel
      .getByRole('button', { name: 'Yes, cancel booking', exact: true })
      .click();
    await expect(detail).toHaveCount(0, { timeout: 70000 });
    await settled(page);
    await expect(page.locator('.bk-notice')).toContainText('is cancelled');
  }
  await expect(page.getByRole('article')).toHaveCount(3);
});

test('real empty account, pending request skeleton and offline error/retry', async ({
  page,
  request,
  context,
}) => {
  await mkdir(shots, { recursive: true });
  const patient = await createTestPatient(request);
  await loginAsTestPatient(page, patient);
  await page.setViewportSize({width:390,height:844});
  await page.goto('/my-consultations');
  await settled(page);
  await expect(
    page.getByRole('heading', { name: 'No bookings yet', exact: true }),
  ).toBeVisible();
  await page.locator('.bk-page').screenshot({ path: `${shots}/empty.png` });
  await expect(
    page.getByRole('link', { name: 'Find Care', exact: true }),
  ).toHaveAttribute('href', '/healthcare-services');
  // Hold the real response only for a loading-state capture; no response data is fabricated.
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/patients/dashboard', async (route) => {
    const response = await route.fetch();
    await held;
    await route.fulfill({ response });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('region', { name: 'Loading bookings', exact: true }),
  ).toBeVisible();
  await page
    .locator('.bk-page')
    .screenshot({ path: `${shots}/loading.png` });
  release();
  await settled(page);
  await page.unroute('**/patients/dashboard');
  await page.route('**/patients/dashboard', (route) =>
    route.abort('internetdisconnected'),
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Unable to load bookings', exact: true }),
  ).toBeVisible();
  await page
    .locator('.bk-error-state')
    .screenshot({ path: `${shots}/error.png` });
  await page.unroute('**/patients/dashboard');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await settled(page);
  await expect(
    page.getByRole('heading', { name: 'No bookings yet', exact: true }),
  ).toBeVisible();
});

test('real completed consultation has prescription and no change/cancel actions', async ({
  page,
  request,
}) => {
  await mkdir(shots, { recursive: true });
  const ops = await body(
    await request.post(`${API}/auth/ops/login`, {
      data: { email: 'ops.support@vizito.test', password: 'OpsSupport123!' },
    }),
  );
  // This test activates its own isolated provider through Ops, without the helper's DB shortcut.
  const doctor = await createTestDoctorWithAvailability(request, async (id) => {
    await body(
      await request.post(`${API}/partners/ops/${id}/review`, {
        headers: { Authorization: `Bearer ${ops.access_token}` },
        data: { action: 'Approve' },
      }),
    );
  });
  const patient = await createTestPatient(request),
    headers = { Authorization: `Bearer ${patient.token}` },
    D = { Authorization: `Bearer ${doctor.token}` };
  const day = localDate(1),
    slots = (
      await body(
        await request.get(
          `${API}/patients/providers/${doctor.partnerId}/slots?date=${day}`,
          { headers },
        ),
      )
    ).data;
  const slot = slots.find((s: any) => !s.is_booked);
  expect(slot).toBeTruthy();
  const booking = (
    await body(
      await request.post(`${API}/patients/bookings`, {
        headers,
        data: {
          partner_id: doctor.partnerId,
          service_type: 'In Person',
          booking_date: day,
          time_slot_id: slot.time_slot_id,
          time_slot: String(slot.start_time).slice(0, 5),
          payment_mode: 'Pay at Clinic (Cash)',
        },
      }),
    )
  ).data;
  const appointments = await body(
    await request.get(`${API}/appointments?date=${day}`, { headers: D }),
  );
  const appointment = (
    Array.isArray(appointments) ? appointments : appointments.data
  ).find(
    (a: any) =>
      a.booking_id === booking.id || a.patient_name === patient.fullName,
  );
  expect(appointment).toBeTruthy();
  const id =
    appointment.appointment_number ||
    appointment.booking_number ||
    appointment.id;
  await body(
    await request.post(`${API}/appointments/${id}/start-consultation`, {
      headers: D,
    }),
  );
  await body(
    await request.post(`${API}/appointments/${id}/consultation`, {
      headers: D,
      data: {
        chief_complaint: 'Local automated UI verification record',
        diagnosis: 'QA fixture — not clinical care',
      },
    }),
  );
  await body(
    await request.post(`${API}/appointments/${id}/prescription`, {
      headers: D,
      data: {
        status: 'Finalized',
        temperature: 98.6,
        systolic_bp: 120,
        diastolic_bp: 80,
        spo2: 99,
        no_known_allergies: true,
        medicines: [],
        general_advice: 'Local UI verification only.',
      },
    }),
  );
  await body(
    await request.post(`${API}/appointments/${id}/complete-consultation`, {
      headers: D,
    }),
  );
  await loginAsTestPatient(page, patient);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/my-consultations');
  await settled(page);
  await page
    .getByRole('button', { name: 'Completed (1)', exact: true })
    .click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText(doctor.fullName);
  await expect(
    page
      .getByRole('article')
      .getByRole('button', { name: 'Reschedule', exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole('article')
      .getByRole('button', { name: 'Cancel', exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: `${shots}/completed-desktop.png` });
  await page
    .getByRole('article')
    .getByRole('button', { name: 'View Details', exact: true })
    .click();
  const detail = page.getByRole('dialog', {
    name: 'Booking details',
    exact: true,
  });
  await expect(
    detail.getByRole('link', { name: 'View prescription', exact: true }),
  ).toBeVisible({ timeout: 70000 });
  await expect(
    detail.getByRole('button', { name: 'Reschedule', exact: true }),
  ).toHaveCount(0);
  await expect(
    detail.getByRole('button', { name: 'Cancel', exact: true }),
  ).toHaveCount(0);
  await detail.screenshot({ path: `${shots}/completed-details.png` });
  await detail
    .getByRole('link', { name: 'View prescription', exact: true })
    .click();
  await expect(page).toHaveURL(/my-records\?open=/);
  await expect(
    page.getByRole('dialog', { name: 'Prescription', exact: true }),
  ).toBeVisible({ timeout: 70000 });
});
