import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { createTestPatient, loginAsTestPatient } from './helpers/testAccount';
import type { VerifiedBloodCentre, AvailabilityResult, BloodReference } from '../src/services/bloodbankHelper';

const empty = 'No verified blood banks on Vizito near you yet. In an emergency call 108.';
test.use({ actionTimeout: 15000 });

test('real directory, saved area, Near me, availability and request navigation', async ({ page, request, context }) => {
  const patient = await createTestPatient(request);
  await loginAsTestPatient(page, patient);
  await page.evaluate(() => sessionStorage.setItem('vizito_search_area', JSON.stringify({
    lat: 17.44, lng: 78.39, source: 'manual', label: 'Hyderabad', at: Date.now(),
  })));
  const referencePromise = page.waitForResponse(r => new URL(r.url()).pathname === '/bloodbank/reference');
  const directoryResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/bloodbank/centres' && new URL(r.url()).searchParams.get('lat') === '17.44');
  await page.goto('/find-blood');
  const response = await directoryResponse;
  expect(response.ok()).toBe(true);
  const { centres }: { centres: VerifiedBloodCentre[] } = await response.json();
  expect(new URL(response.url()).searchParams.get('lng')).toBe('78.39');
  await expect(page.getByRole('combobox', { name: 'Blood group', exact: true })).toHaveValue('');
  await expect(page.getByRole('status').filter({ hasText: 'Loading verified blood banks' })).toHaveCount(0);
  await expect(page.locator('article li')).toHaveCount(0);
  if (!centres.length) await expect(page.getByText(empty, { exact: true })).toBeVisible();
  else {
    await expect(page.getByRole('region', { name: 'Blood banks', exact: true }).getByRole('article')).toHaveCount(centres.length);
    for (const centre of centres) {
      const card = page.getByRole('article', { name: centre.name, exact: true });
      await expect(card.getByRole('heading', { name: centre.name, exact: true })).toBeVisible();
      for (const value of [centre.address, centre.pincode, centre.distance_km == null ? null : `${centre.distance_km} km`]) {
        if (value) await expect(card).toContainText(value);
      }
      if (centre.phone) await expect(card.getByRole('link', { name: 'Call', exact: true })).toHaveAttribute('href', `tel:${centre.phone}`);
      const href = await card.getByRole('link', { name: 'Request blood', exact: true }).getAttribute('href');
      expect(new URL(href!, 'http://localhost').searchParams.get('bank')).toBe(centre.partner_id);
    }
  }
  await mkdir('artifacts/find-blood-centres', { recursive: true });
  await page.screenshot({ path: 'artifacts/find-blood-centres/directory-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.getByRole('complementary', { name: 'Main navigation' }).evaluate(el => el.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  await expect.poll(() => page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/find-blood-centres/directory-mobile.png', fullPage: true });
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 17.45, longitude: 78.4 });
  const nearby = page.waitForResponse(r => new URL(r.url()).pathname === '/bloodbank/centres' && new URL(r.url()).searchParams.get('lat') === '17.45');
  await page.getByRole('button', { name: 'Near me', exact: true }).click();
  expect((await nearby).ok()).toBe(true);
  const referenceResponse = await referencePromise;
  expect(referenceResponse.ok()).toBe(true);
  const reference: BloodReference = await referenceResponse.json();
  const group = reference.groups[0].code;
  const availabilityResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/bloodbank/availability' && new URL(r.url()).searchParams.get('group') === group);
  await page.getByRole('combobox', { name: 'Blood group', exact: true }).selectOption(group);
  const availability = await availabilityResponse;
  expect(availability.ok()).toBe(true);
  expect(new URL(availability.url()).searchParams.get('lat')).toBe('17.45');
  const data: AvailabilityResult = await availability.json();
  await expect(page.getByRole('article')).toHaveCount(data.centres.length);
  for (const centre of data.centres) {
    const card = page.getByRole('article', { name: centre.name, exact: true });
    await expect(card.locator('li')).toHaveCount(data.components.length);
    for (const code of data.components) {
      const name = reference.components.find(c => c.code === code)!.name;
      await expect(card.getByText(`${group} ${name}: ${centre.bands[code] === 'AVAILABLE' ? 'Available' : 'Not available'}`, { exact: true })).toBeVisible();
    }
  }
  if (data.centres.length) {
    await page.getByRole('article').first().getByRole('link', { name: 'Request blood', exact: true }).click();
    await expect(page).toHaveURL(/\/request-blood\?/);
    expect(new URL(page.url()).searchParams.get('group')).toBe(group);
  }
});

test('real transport failure shows an alert and Retry restores the directory', async ({ page, request, context }) => {
  const patient = await createTestPatient(request);
  await loginAsTestPatient(page, patient);
  const first = page.waitForResponse(r => new URL(r.url()).pathname === '/bloodbank/centres');
  await page.goto('/find-blood');
  expect((await first).ok()).toBe(true);
  await expect(page.getByRole('combobox', { name: 'Blood group', exact: true })).toBeEnabled();
  await context.setOffline(true);
  // Select a real group, then clear it: the actual directory request fails offline.
  const group = await page.getByRole('combobox', { name: 'Blood group', exact: true }).locator('option').nth(1).getAttribute('value');
  await page.getByRole('combobox', { name: 'Blood group', exact: true }).selectOption(group!);
  await page.getByRole('combobox', { name: 'Blood group', exact: true }).selectOption('');
  await expect(page.getByRole('alert').filter({ hasText: 'Could not load verified blood banks.' })).toBeVisible();
  await expect(page.getByText(empty, { exact: true })).toHaveCount(0);
  await context.setOffline(false);
  const retry = page.waitForResponse(r => new URL(r.url()).pathname === '/bloodbank/centres');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  const response = await retry;
  expect(response.ok()).toBe(true);
  const { centres } = await response.json();
  await expect(page.getByRole('article')).toHaveCount(centres.length);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
