// @vitest-environment jsdom
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { googlePatientApi } from './authHelper';
import apiClient from './index';

describe('googlePatientApi and auth interceptor', () => {
  const originalAdapter = apiClient.defaults.adapter;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
    localStorage.clear();
  });

  it('posts { idToken } to /patient/auth/google without attaching stale bearer tokens', async () => {
    localStorage.setItem('vizito_token', 'stale-token');
    let seenAuthHeader: unknown = 'unset';
    let seenUrl: string | undefined;
    let seenBody: unknown;

    apiClient.defaults.adapter = async (config) => {
      seenUrl = config.url;
      seenAuthHeader = config.headers?.Authorization;
      seenBody = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      return {
        data: { success: true, token: 'new-token', patient_id: 'pat-1' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const res = await googlePatientApi('id-token-xyz');
    expect(seenUrl).toBe('/patient/auth/google');
    expect(seenBody).toEqual({ idToken: 'id-token-xyz' });
    expect(seenAuthHeader).toBeUndefined();
    expect(res.token).toBe('new-token');
  });

  it('does not clear localStorage on 401 from /patient/auth/google', async () => {
    localStorage.setItem('vizito_token', 'existing-token');
    localStorage.setItem('vizito_user', JSON.stringify({ patient_id: '1' }));

    apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
      throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config,
        data: { message: 'Invalid Google token' },
      });
    };

    await expect(googlePatientApi('bad-token')).rejects.toMatchObject({
      response: { status: 401, data: { message: 'Invalid Google token' } },
    });
    expect(localStorage.getItem('vizito_token')).toBe('existing-token');
    expect(localStorage.getItem('vizito_user')).not.toBeNull();
  });
});
