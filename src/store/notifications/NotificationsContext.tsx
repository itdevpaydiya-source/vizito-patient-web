import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  getNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
  deleteNotificationApi,
  type PatientNotification,
} from '../../services/notificationHelper';

interface NotificationsContextType {
  items: PatientNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// True when the patient is logged in — avoids calling /notifications on the auth screens.
const hasToken = (): boolean => {
  try {
    if (localStorage.getItem('vizito_token')) return true;
    const u = JSON.parse(localStorage.getItem('vizito_user') || '{}');
    return !!(u?.token || u?.access_token);
  } catch {
    return false;
  }
};

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<PatientNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = items.filter((n) => n.unread).length;

  const refresh = useCallback(async () => {
    if (!hasToken()) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItems(await getNotificationsApi());
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load notifications.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and whenever auth changes (login/logout dispatch this event elsewhere).
  useEffect(() => {
    refresh();
    const onAuth = () => refresh();
    window.addEventListener('vizito-auth-changed', onAuth);
    window.addEventListener('storage', onAuth);
    // Any part of the app can request an immediate refresh (e.g. right after the patient books)
    // so the bell updates instantly instead of waiting for the next poll.
    window.addEventListener('vizito-notifications-refresh', onAuth);
    return () => {
      window.removeEventListener('vizito-auth-changed', onAuth);
      window.removeEventListener('storage', onAuth);
      window.removeEventListener('vizito-notifications-refresh', onAuth);
    };
  }, [refresh]);

  // Poll so the bell reflects notifications from ANY event (booking, status change, prescription,
  // review, ...) in near-real-time — the context otherwise only fetched once at app load, so a
  // notification created while the app was open never appeared until a full reload. Also refresh
  // when the tab regains focus. Only runs while authenticated and the tab is visible.
  useEffect(() => {
    const POLL_MS = 30000;
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      refresh();
    };
    const interval = window.setInterval(tick, POLL_MS);
    const onFocus = () => tick();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    // Optimistic: clear the badge immediately so it feels instant, then persist.
    setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
    try {
      await markAllNotificationsReadApi();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to mark notifications as read.');
    } finally {
      // Always reconcile with the real server state right away — the backend can report
      // success on a request that structurally changed nothing (e.g. a recipient-id
      // scoping mismatch upstream), which a bare try/catch around the HTTP call can't
      // detect. Waiting for the next poll (up to 30s, or never if the tab closes first)
      // is exactly what let a failed persist look like a real "read" until refresh.
      await refresh();
    }
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
    try {
      await markNotificationReadApi(id);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to mark notification as read.');
    } finally {
      await refresh();
    }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const prev = items;
    setItems((cur) => cur.filter((n) => n.id !== id));
    try {
      await deleteNotificationApi(id);
    } catch {
      setItems(prev); // restore on failure
    }
  }, [items]);

  return (
    <NotificationsContext.Provider value={{ items, unreadCount, loading, error, refresh, markAllRead, markRead, remove }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (ctx === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return ctx;
};
