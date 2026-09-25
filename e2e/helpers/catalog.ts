import type { APIRequestContext } from '@playwright/test';

const API = process.env.VITE_API_URL || 'http://localhost:3000';

// Tests use a real platform-standard pharmacy category instead of creating throwaway ones
// (categories are shared master data; per-run test categories used to pile up for everyone).
// Response-shaped so existing `.ok()` / `.json()` call sites stay unchanged.
export async function standardCategoryResponse(request: APIRequestContext) {
  const res = await request.get(`${API}/category?provider_type=pharmacy`);
  const list: Array<{ id: number; name: string; code: string }> = await res.json();
  const category = list.find((c) => c.code === 'ANALGESIC') ?? list[0];
  if (!category) throw new Error('No standard pharmacy categories found — run the vizito-catalogue migrations');
  return { ok: () => true, status: () => 200, json: async () => category, text: async () => JSON.stringify(category) };
}
