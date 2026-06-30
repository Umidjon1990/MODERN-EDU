import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from './index.js';

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => fetchMock.mockReset());

function ok(json: unknown, status = 200) {
  return { ok: true, status, json: async () => json };
}

describe('ApiClient', () => {
  it('login /api/v1/auth/login ga POST qiladi va tokenlarni saqlaydi', async () => {
    const onTokens = vi.fn();
    fetchMock.mockResolvedValue(ok({ accessToken: 'a', refreshToken: 'r', user: { id: '1' } }));
    const api = new ApiClient({ baseUrl: 'http://x', onTokens });
    const res = await api.auth.login('admin', 'admin123');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://x/api/v1/auth/login');
    expect(init.method).toBe('POST');
    expect(onTokens).toHaveBeenCalledWith({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: '1' },
    });
    expect(res.accessToken).toBe('a');
  });

  it('Bearer tokenni qo‘shadi va trailing slash’ni normallashtiradi', async () => {
    fetchMock.mockResolvedValue(ok([]));
    const api = new ApiClient({ baseUrl: 'http://x/', getAccessToken: () => 'tok' });
    await api.classes.list();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://x/api/v1/classes');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('xato javobda ApiError tashlaydi', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'yomon' }),
    });
    const api = new ApiClient({ baseUrl: 'http://x' });
    await expect(api.classes.list()).rejects.toBeInstanceOf(ApiError);
  });
});
