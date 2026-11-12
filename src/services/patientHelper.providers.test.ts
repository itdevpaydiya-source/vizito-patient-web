// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { getProvidersApi, getProvidersPageApi } from './patientHelper';
import apiClient from './index';

describe('provider service query mapping (bloodbank and service categories)', () => {
  const originalAdapter = apiClient.defaults.adapter;

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it('maps bloodbank and every Explore category to canonical backend service query params', async () => {
    const requestedParams: Array<Record<string, unknown>> = [];
    apiClient.defaults.adapter = async (config) => {
      requestedParams.push({ ...(config.params || {}) });
      return {
        data: { success: true, data: [], total: 0, page: 1, limit: 10 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    await getProvidersApi('bloodbank');
    await getProvidersPageApi('bloodbank', undefined, 1, 10, { lat: 17.4483, lng: 78.3915, sort: 'nearest' });
    await getProvidersPageApi('doctor', undefined, 1, 10);
    await getProvidersPageApi('hospital', undefined, 1, 10);
    await getProvidersPageApi('diagnostic', undefined, 1, 10);
    await getProvidersPageApi('homecare', undefined, 1, 10);
    await getProvidersPageApi('pharmacy', undefined, 1, 10);
    await getProvidersPageApi('equipment', undefined, 1, 10);
    await getProvidersPageApi('ambulance', undefined, 1, 10);

    expect(requestedParams.map((p) => p.service)).toEqual([
      'BLOOD_BANK',
      'BLOOD_BANK',
      'DOCTOR',
      'HOSPITAL',
      'LAB',
      'HOME_CARE',
      'PHARMACY',
      'EQUIPMENT',
      'AMBULANCE',
    ]);
  });

  it('returns empty page when backend returns no matching blood banks (never falls back to all providers)', async () => {
    let calls = 0;
    apiClient.defaults.adapter = async (config) => {
      calls += 1;
      return {
        data: { success: true, data: [], total: 0, page: 1, limit: 10 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const page = await getProvidersPageApi('bloodbank', 'NoSuchBank', 1, 10);
    expect(calls).toBe(1);
    expect(page).toEqual({ items: [], total: 0, page: 1, limit: 10 });
  });
});

