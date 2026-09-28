import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';

// Help & Support: a patient raises a real ticket (with a screenshot), follows it, gets a support
// reply (in the thread and the notification bell), answers, and closes it.
test.describe.configure({ timeout: 180000 });
const api = 'http://localhost:3000';
const shots = process.env.UX_SHOTS_DIR;

// The support team has no console in this dev setup yet, so the reply is sent the way the gateway
// would forward an admin's call: straight to vizito-auth with the internal secret + an admin identity.
const gatewaySecret = () => {
  const env = readFileSync('../vizito-replica-backend/vizito-auth/.env', 'utf8');
  return (env.match(/^GATEWAY_INTERNAL_SECRET=(.*)$/m)?.[1] || '').trim().replace(/^["']|["']$/g, '');
};
const PNG_1PX = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('patient raises, follows and closes a support request', async ({ page, request }) => {
  const patient = await createTestPatient(request);
  await loginAsTestPatient(page, patient);
  await page.goto('/help');

  await expect(page.getByRole('link', { name: 'Call 108' })).toHaveAttribute('href', 'tel:108');
  await expect(page.getByText('No requests yet.')).toBeVisible();

  // Validation: nothing chosen, then a payment problem without its booking.
  await page.getByRole('button', { name: /Report a problem/ }).click();
  const form = page.getByRole('dialog', { name: 'Report a problem' });
  await form.getByRole('button', { name: 'Send to support' }).click();
  await expect(form.getByRole('alert')).toHaveText('Choose what your request is about.');
  await form.getByLabel('What is it about? *').selectOption('Payment & refund');
  await form.getByLabel('Subject *').fill('Money deducted twice');
  await form.getByLabel('Details *').fill('UPI debited ₹650 twice for one appointment, ref 4312 8890.');
  await form.getByRole('button', { name: 'Send to support' }).click();
  await expect(form.getByRole('alert')).toContainText('Choose the booking this payment is for');

  // A real app problem with a screenshot.
  await form.getByLabel('What is it about? *').selectOption('App problem');
  await form.getByLabel('Subject *').fill('Prescription PDF will not download');
  await form.getByLabel('Details *').fill('Print / Download opens a blank window on my phone browser.');
  await form.getByLabel(/Screenshot or receipt/).setInputFiles({ name: 'blank-window.png', mimeType: 'image/png', buffer: PNG_1PX });
  await form.getByRole('button', { name: 'Send to support' }).click();
  await expect(form.getByRole('status')).toContainText(/Your request number is SUP-\d{8}-\d{4}/);
  if (shots) await page.screenshot({ path: `${shots}/help_ticket_sent.png` });
  await form.getByRole('button', { name: 'Done' }).click();

  const list = page.getByRole('list', { name: 'Your support requests' });
  await expect(list.getByRole('button', { name: /Prescription PDF will not download/ })).toContainText('Open');

  // The thread: description, attachment, waiting note; the patient adds detail.
  await list.getByRole('button', { name: /Prescription PDF will not download/ }).click();
  const detail = page.getByRole('dialog', { name: 'Support request' });
  await expect(detail.getByText('Print / Download opens a blank window')).toBeVisible();
  await expect(detail.getByRole('link', { name: 'blank-window.png' })).toBeVisible();
  await expect(detail.getByText(/Waiting for the support team/)).toBeVisible();
  await detail.getByLabel('Your reply').fill('It happens in Chrome on Android 14.');
  await detail.getByRole('button', { name: 'Send reply' }).click();
  await expect(detail.getByText('It happens in Chrome on Android 14.')).toBeVisible();
  await detail.getByRole('button', { name: 'Close', exact: true }).click();

  // Patients can't use the support-team routes.
  const mine = await (await request.get(`${api}/support-tickets`, { headers: { Authorization: `Bearer ${patient.token}` } })).json();
  const ticket = mine[0];
  expect((await request.get(`${api}/support-tickets/admin/all`, { headers: { Authorization: `Bearer ${patient.token}` } })).status()).toBe(403);

  // Support replies and marks it resolved.
  const reply = await request.post(`http://localhost:4401/support-tickets/admin/${ticket.id}/reply`, {
    headers: { 'x-gateway-secret': gatewaySecret(), 'x-user': JSON.stringify({ sub: 1, roles: ['admin'], full_name: 'Asha (Vizito Support)' }) },
    data: { body: 'Thanks! Please use "Save as PDF" in the print dialog; a fix for Android is on the way.', status: 'RESOLVED' },
  });
  expect(reply.status()).toBe(201);

  await page.reload();
  await expect(list.getByRole('button', { name: /Prescription PDF will not download/ })).toContainText('Resolved');
  await page.goto('/notifications');
  // The notification opens that exact ticket.
  await page.getByRole('button', { name: new RegExp(`Vizito Support replied to ${ticket.ticket_number}`) }).click();
  await expect(page).toHaveURL(/\/help\?ticket=/);
  await expect(detail.getByText('Asha (Vizito Support)', { exact: false })).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}/help_ticket_thread.png` });
  await detail.getByRole('button', { name: 'Close request' }).click();
  await expect(detail.getByText('This request is closed.')).toBeVisible();
  await expect(detail.getByLabel('Your reply')).toHaveCount(0);
});
