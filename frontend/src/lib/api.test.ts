import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { apiAssetUrl, apiRequest, apiUrl } from './api';

describe('api helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds API and asset URLs from the configured base URL', () => {
    expect(apiUrl('/detection/history')).toBe('http://localhost:8000/api/v1/detection/history');
    expect(apiAssetUrl('/api/v1/uploads/leaf.jpg')).toBe('http://localhost:8000/api/v1/uploads/leaf.jpg');
    expect(apiAssetUrl('https://cdn.example.com/leaf.jpg')).toBe('https://cdn.example.com/leaf.jpg');
  });

  it('adds bearer auth and parses JSON responses', async () => {
    localStorage.setItem('agricosmo-token', 'test-token');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiRequest<{ ok: boolean }>('/metrics/health/db');
    const [, options] = fetchMock.mock.calls[0];
    const headers = options.headers as Headers;

    expect(result.ok).toBe(true);
    expect(headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('surfaces backend error messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: 'Invalid file type' }), { status: 400 }),
      ),
    );

    await expect(apiRequest('/detection/analyze')).rejects.toThrow('Invalid file type');
  });
});
