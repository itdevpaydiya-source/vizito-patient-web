import { useEffect, useState } from 'react';
import { getFavoritesApi, addFavoriteApi, removeFavoriteApi } from './patientHelper';

// One shared list of the patient's saved providers (doctors, hospitals, labs, pharmacies, home care),
// loaded once and kept in sync across every card that shows a heart.
let byPartner: Record<string, string> | null = null; // partnerId -> favoriteId
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const loadFavorites = (force = false): Promise<void> => {
  if (byPartner && !force) return Promise.resolve();
  if (loading) return loading;
  loading = getFavoritesApi()
    .then((list) => { byPartner = Object.fromEntries(list.filter((f) => f.partnerId).map((f) => [String(f.partnerId), f.id])); })
    .catch(() => { byPartner = byPartner || {}; })
    .finally(() => { loading = null; emit(); });
  return loading;
};

export const toggleFavorite = async (partnerId: string): Promise<boolean> => {
  await loadFavorites();
  const id = byPartner?.[partnerId];
  if (id) {
    byPartner = { ...byPartner }; delete byPartner[partnerId]; emit();
    try { await removeFavoriteApi(id); } catch (e) { await loadFavorites(true); throw e; }
    return false;
  }
  byPartner = { ...(byPartner || {}), [partnerId]: 'pending' }; emit();
  try { await addFavoriteApi({ doctor_partner_id: partnerId }); } finally { await loadFavorites(true); }
  return true;
};

export const useIsFavorite = (partnerId: string): boolean => {
  const [, tick] = useState(0);
  useEffect(() => { const l = () => tick((n) => n + 1); listeners.add(l); loadFavorites(); return () => { listeners.delete(l); }; }, []);
  return Boolean(byPartner?.[partnerId]);
};
