import { useEffect } from 'react';
import { Bell, Calendar, FileText, Star, Trash2, AlertCircle } from 'lucide-react';
import { useNotifications } from '../../../store/notifications/NotificationsContext';

// Real patient notifications from the backend feed (vizito-booking). Opening this page marks
// everything read so the header bell drops to 0; per-item delete is available. Honest empty/error/
// loading states — no fabricated notifications.
const categoryIcon = (category: string) => {
  const c = (category || '').toLowerCase();
  if (c.includes('appoint')) return <Calendar className="w-4.5 h-4.5" />;
  if (c.includes('record') || c.includes('prescription')) return <FileText className="w-4.5 h-4.5" />;
  if (c.includes('review') || c.includes('rating') || c.includes('announce')) return <Star className="w-4.5 h-4.5" />;
  return <Bell className="w-4.5 h-4.5" />;
};

export default function NotificationsScreen() {
  const { items, loading, error, markAllRead, remove, refresh } = useNotifications();

  // On open: mark all read so the bell badge clears. markAllRead() itself fetches the real
  // list as its final step (see NotificationsContext), so a separate leading refresh() here
  // would just cause the loading skeleton to flash twice for no benefit.
  useEffect(() => {
    markAllRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Notifications</h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
          Updates about your bookings, consultations, prescriptions, and reviews.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse flex gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-rose-200 py-16 px-4 text-center shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-lg">Couldn't load notifications</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">{error}</p>
          <button
            onClick={() => refresh()}
            className="mt-1 px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-xl transition-all"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-20 px-4 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Bell className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-800 text-lg">No notifications</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
              You're all caught up. Updates about your bookings and consultations will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-2xl border p-4 flex gap-3 items-start transition-all ${n.unread ? 'border-teal-200 ring-1 ring-teal-100' : 'border-slate-200'
                }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.unread ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-400'
                }`}>
                {categoryIcon(n.category)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-800 truncate">{n.title}</h4>
                  {n.unread && <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                  {[n.date, n.time].filter(Boolean).join(' • ') || 'Recently'}
                </p>
              </div>
              <button
                onClick={() => remove(n.id)}
                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                aria-label="Delete notification"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
