// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthModule, { formatGoogleAuthError } from './AuthModule';
import * as authHelper from '../../../services/authHelper';

vi.mock('../../../services/authHelper', () => ({
  loginPatientApi: vi.fn(),
  sendOtpApi: vi.fn(),
  verifyOtpApi: vi.fn(),
  googlePatientApi: vi.fn(),
  forgotPasswordApi: vi.fn(),
  verifyForgotPasswordOtpApi: vi.fn(),
  resetPasswordApi: vi.fn(),
  registerSendOtpApi: vi.fn(),
  registerVerifyOtpApi: vi.fn(),
  registerPatientApi: vi.fn(),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('AuthModule Google Sign-In', () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderAuth = async (onLoginSuccess = vi.fn()) => {
    await act(async () => {
      root.render(<AuthModule onLoginSuccess={onLoginSuccess} />);
    });
    return onLoginSuccess;
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    localStorage.clear();
    delete window.google;
    document.getElementById('google-gis-script')?.remove();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllEnvs();
    delete window.google;
    document.getElementById('google-gis-script')?.remove();
  });

  it('disables Google button with a hint instead of an error when VITE_GOOGLE_CLIENT_ID is missing', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    await renderAuth();

    const btn = container.querySelector('.auth-v2-btn-google') as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    expect(btn?.disabled).toBe(true);
    expect(btn?.getAttribute('aria-disabled')).toBe('true');
    expect(container.textContent).toContain('Google Sign-In is unavailable in this environment');
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(document.getElementById('google-gis-script')).toBeNull();
  });

  it('loads GSI, initializes with VITE_GOOGLE_CLIENT_ID, posts idToken and completes patient login', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');

    let capturedCallback: ((response: { credential?: string }) => void) | undefined;
    const initialize = vi.fn((cfg: { client_id: string; callback: (res: { credential?: string }) => void }) => {
      capturedCallback = cfg.callback;
    });
    const renderButton = vi.fn((el: HTMLElement) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Continue with Google';
      el.appendChild(btn);
    });

    vi.mocked(authHelper.googlePatientApi).mockResolvedValue({
      success: true,
      token: 'patient-jwt-token',
      access_token: 'patient-jwt-token',
      patient_id: 'pat-uuid-1',
      full_name: 'Asha Rao',
      email: 'asha@example.com',
      mobile: null,
    });

    const onLoginSuccess = await renderAuth();

    const script = document.getElementById('google-gis-script') as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script?.src).toBe('https://accounts.google.com/gsi/client');
    expect(script?.referrerPolicy).toBe('strict-origin-when-cross-origin');

    window.google = { accounts: { id: { initialize, renderButton } } };
    await act(async () => {
      script?.dispatchEvent(new Event('load'));
    });

    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'test-client-id.apps.googleusercontent.com' }),
    );
    expect(renderButton).toHaveBeenCalledTimes(1);
    expect(capturedCallback).toBeTypeOf('function');

    await act(async () => {
      await capturedCallback?.({ credential: 'google-id-token-abc' });
    });

    expect(authHelper.googlePatientApi).toHaveBeenCalledWith('google-id-token-abc');
    expect(onLoginSuccess).toHaveBeenCalledWith({
      patient_id: 'pat-uuid-1',
      email: 'asha@example.com',
      mobile: '',
      fullName: 'Asha Rao',
      token: 'patient-jwt-token',
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('shows plain-word errors for invalid Google token and role mismatch without calling onLoginSuccess', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');

    let capturedCallback: ((response: { credential?: string }) => void) | undefined;
    const initialize = vi.fn((cfg: { client_id: string; callback: (res: { credential?: string }) => void }) => {
      capturedCallback = cfg.callback;
    });
    const renderButton = vi.fn();

    const onLoginSuccess = await renderAuth();
    const script = document.getElementById('google-gis-script') as HTMLScriptElement;
    window.google = { accounts: { id: { initialize, renderButton } } };
    await act(async () => {
      script.dispatchEvent(new Event('load'));
    });

    vi.mocked(authHelper.googlePatientApi).mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Invalid Google token' } },
    });
    await act(async () => {
      await capturedCallback?.({ credential: 'bad-token' });
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'Google sign-in could not be verified. Please try again.',
    );

    vi.mocked(authHelper.googlePatientApi).mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Account not authorized for role patient' } },
    });
    await act(async () => {
      await capturedCallback?.({ credential: 'partner-token' });
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'registered under a different role and cannot sign in as a patient',
    );
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it('handles GSI script load failure with a quiet hint rather than an error alert', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');
    await renderAuth();

    const script = document.getElementById('google-gis-script') as HTMLScriptElement;
    await act(async () => {
      script.dispatchEvent(new Event('error'));
    });

    const btn = container.querySelector('.auth-v2-btn-google') as HTMLButtonElement | null;
    expect(btn?.disabled).toBe(true);
    expect(container.textContent).toContain('Google Sign-In could not load right now');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('formats Google backend and network errors into plain language', () => {
    expect(formatGoogleAuthError({ isAxiosError: true, message: 'Network Error' })).toContain(
      'Could not reach Vizito',
    );
    expect(
      formatGoogleAuthError({ response: { status: 401, data: { message: 'Google account email not verified' } } }),
    ).toContain('email is not verified');
    expect(
      formatGoogleAuthError({ response: { status: 401, data: { message: 'Account is disabled or blocked' } } }),
    ).toContain('disabled or blocked');
  });
});
