import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Search,
  Check,
  CheckCircle2,
  Trash2,
  X,
  Sparkles,
  Calendar,
  CreditCard,
  Clock,
  Navigation,
  FileText,
  ShieldCheck,
  Megaphone,
  ArrowRight,
  Filter,
  AlertCircle,
  Eye,
  RotateCcw
} from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  fullDescription: string;
  category:
    | 'Appointments'
    | 'Bookings'
    | 'Orders'
    | 'Queue Updates'
    | 'Tracking Updates'
    | 'Payments'
    | 'Medical Records'
    | 'Account Activities'
    | 'General Announcements';
  date: string;
  time: string;
  timestamp: string; // ISO string for sorting (reverse chronological order)
  unread: boolean;
  relatedService?: string;
  navigationPath?: string;
  metadata?: Record<string, any>;
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'NOTIF-001',
    title: 'Appointment Confirmed',
    desc: 'Your appointment with Dr. Rahul Sharma has been confirmed.',
    fullDescription:
      'Your video consultation appointment with Dr. Rahul Sharma (General Medicine) has been confirmed for 20 July 2026 at 10:30 AM. Please join the video room 5 minutes prior to the slot.',
    category: 'Appointments',
    date: '20 Jul 2026',
    time: '10:45 AM',
    timestamp: '2026-07-20T10:45:00',
    unread: true,
    relatedService: 'Doctor Consultation',
    navigationPath: '/bookings'
  },
  {
    id: 'NOTIF-002',
    title: 'Payment Successful',
    desc: '₹500 Payment Received for Pharmacy Order #BK000249.',
    fullDescription:
      'Payment of ₹500 was successfully processed via UPI for Pharmacy Order #BK000249. Digital tax invoice has been generated.',
    category: 'Payments',
    date: '20 Jul 2026',
    time: '10:20 AM',
    timestamp: '2026-07-20T10:20:00',
    unread: true,
    relatedService: 'Pharmacy Order',
    navigationPath: '/bookings'
  },
  {
    id: 'NOTIF-003',
    title: 'Queue Updated',
    desc: 'Your Queue Token #15 at Max Healthcare. 3 patients ahead.',
    fullDescription:
      'Token #15 OPD Queue Update: 3 patients are currently ahead of you. Estimated waiting time is approximately 20 minutes.',
    category: 'Queue Updates',
    date: '20 Jul 2026',
    time: '10:15 AM',
    timestamp: '2026-07-20T10:15:00',
    unread: true,
    relatedService: 'Hospital Consultation',
    navigationPath: '/bookings'
  },
  {
    id: 'NOTIF-004',
    title: 'Caregiver On The Way',
    desc: 'Viziito Home Care nurse is en route. Est. Arrival: 10 mins.',
    fullDescription:
      'Your assigned home care nurse is en route to H.No 4-12, Madhapur. Estimated arrival time is 10 minutes. Track live GPS status.',
    category: 'Tracking Updates',
    date: '20 Jul 2026',
    time: '09:30 AM',
    timestamp: '2026-07-20T09:30:00',
    unread: true,
    relatedService: 'Home Care Services',
    navigationPath: '/bookings'
  },
  {
    id: 'NOTIF-005',
    title: 'Medical Record Uploaded',
    desc: 'Blood Test & Lipid Profile Report uploaded successfully.',
    fullDescription:
      'Blood Test & Lipid Profile Report (PDF) uploaded to Medical Records for Ravi Kumar. Stored securely for future booking attachment.',
    category: 'Medical Records',
    date: '19 Jul 2026',
    time: '04:00 PM',
    timestamp: '2026-07-19T16:00:00',
    unread: false,
    relatedService: 'Diagnostic Laboratory',
    navigationPath: '/my-records'
  },
  {
    id: 'NOTIF-006',
    title: 'Ambulance Dispatched',
    desc: 'RedCross ALS Ambulance unit #402 en route to Jubilee Hills.',
    fullDescription:
      'Advanced Life Support (ALS ICU) Ambulance Unit #402 has been dispatched to Plot 45, Jubilee Hills. Paramedic crew standby.',
    category: 'Tracking Updates',
    date: '19 Jul 2026',
    time: '02:15 PM',
    timestamp: '2026-07-19T14:15:00',
    unread: false,
    relatedService: 'Scheduled Ambulance',
    navigationPath: '/bookings'
  },
  {
    id: 'NOTIF-007',
    title: 'Password Changed Successfully',
    desc: 'Your health account security credentials were updated.',
    fullDescription:
      'The password for your VIZITO account was changed successfully. If you did not initiate this change, please review security settings immediately.',
    category: 'Account Activities',
    date: '18 Jul 2026',
    time: '11:00 AM',
    timestamp: '2026-07-18T11:00:00',
    unread: false,
    relatedService: 'Profile & Security',
    navigationPath: '/profile'
  },
  {
    id: 'NOTIF-008',
    title: 'Wellness Announcement',
    desc: 'Viziito Wellness Month: 20% discount on Master Health Checkups.',
    fullDescription:
      'Book any Master Health Checkup Package or Diabetes Screen with free home sample collection this month and get flat 20% cashback.',
    category: 'General Announcements',
    date: '17 Jul 2026',
    time: '09:00 AM',
    timestamp: '2026-07-17T09:00:00',
    unread: false,
    relatedService: 'Health Announcement',
    navigationPath: '/healthcare-services'
  }
];

export default function NotificationsScreen() {
  const navigate = useNavigate();

  // State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [detailModal, setDetailModal] = useState<NotificationItem | null>(null);
  const [deleteModal, setDeleteModal] = useState<NotificationItem | null>(null);
  const [clearAllModal, setClearAllModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vizito_patient_notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotifications(parsed);
          return;
        }
      }
      setNotifications(INITIAL_NOTIFICATIONS);
    } catch (e) {
      console.error(e);
      setNotifications(INITIAL_NOTIFICATIONS);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const saveNotifications = (updated: NotificationItem[]) => {
    setNotifications(updated);
    try {
      localStorage.setItem('vizito_patient_notifications', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  // Sort in reverse chronological order (newest first)
  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Filter by tab & search query
  const filteredNotifications = sortedNotifications.filter((n) => {
    const matchesTab = activeTab === 'all' || (activeTab === 'unread' && n.unread);
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      n.title.toLowerCase().includes(searchLower) ||
      n.desc.toLowerCase().includes(searchLower) ||
      (n.relatedService && n.relatedService.toLowerCase().includes(searchLower));

    return matchesTab && matchesSearch;
  });

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Category Icon & Styling Helper
  const getCategoryTheme = (category: NotificationItem['category']) => {
    switch (category) {
      case 'Appointments':
      case 'Bookings':
        return { icon: Calendar, bg: 'bg-violet-50 text-violet-700 border-violet-200' };
      case 'Payments':
        return { icon: CreditCard, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'Queue Updates':
        return { icon: Clock, bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'Tracking Updates':
        return { icon: Navigation, bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'Medical Records':
        return { icon: FileText, bg: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'Account Activities':
        return { icon: ShieldCheck, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'General Announcements':
      default:
        return { icon: Megaphone, bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
  };

  // Open notification details & automatically mark as Read
  const handleOpenDetails = (item: NotificationItem) => {
    if (item.unread) {
      const updated = notifications.map((n) => (n.id === item.id ? { ...n, unread: false } : n));
      saveNotifications(updated);
    }
    setDetailModal({ ...item, unread: false });
  };

  // Mark single as read
  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = notifications.map((n) => (n.id === id ? { ...n, unread: false } : n));
    saveNotifications(updated);
    showToast('Notification marked as read.');
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, unread: false }));
    saveNotifications(updated);
    showToast('All notifications marked as read.');
  };

  // Delete single notification
  const handleConfirmDelete = () => {
    if (!deleteModal) return;
    const updated = notifications.filter((n) => n.id !== deleteModal.id);
    saveNotifications(updated);
    if (detailModal?.id === deleteModal.id) {
      setDetailModal(null);
    }
    setDeleteModal(null);
    showToast('Notification deleted.');
  };

  // Clear all notifications
  const handleConfirmClearAll = () => {
    saveNotifications([]);
    setClearAllModal(false);
    setDetailModal(null);
    showToast('Notifications cleared successfully.');
  };

  // Navigation action to related module
  const handleNavigateToService = (item: NotificationItem) => {
    setDetailModal(null);
    if (item.navigationPath) {
      navigate(item.navigationPath);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-5xl mx-auto">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs font-extrabold bg-rose-500 text-white px-2.5 py-0.5 rounded-full">
                {unreadCount} Unread
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Real-time updates on appointment bookings, live queues, order dispatch, payments, and account security.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 text-emerald-600" /> Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => setClearAllModal(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Tab Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'all'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeTab === 'unread'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notifications by title or service..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notification List (Reverse Chronological Order) */}
      {filteredNotifications.length > 0 ? (
        <div className="space-y-3">
          {filteredNotifications.map((item) => {
            const theme = getCategoryTheme(item.category);
            const IconComponent = theme.icon;

            return (
              <div
                key={item.id}
                onClick={() => handleOpenDetails(item)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-start justify-between gap-4 group relative ${
                  item.unread
                    ? 'bg-teal-50/20 border-teal-200 shadow-sm hover:border-teal-400'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Left Indicator & Icon */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 text-base ${theme.bg}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {item.unread && (
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" title="Unread notification" />
                      )}
                      <h3 className={`text-sm truncate ${item.unread ? 'font-black text-slate-900' : 'font-extrabold text-slate-700'}`}>
                        {item.title}
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2 leading-relaxed">
                      {item.desc}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-semibold">
                      <span>{item.date} • {item.time}</span>
                      {item.relatedService && (
                        <>
                          <span>•</span>
                          <span className="text-teal-700 font-extrabold">{item.relatedService}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Menu */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.unread && (
                    <button
                      onClick={(e) => handleMarkAsRead(item.id, e)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] transition-colors"
                      title="Mark as Read"
                    >
                      Read
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModal(item);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 py-16 px-4 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 text-2xl">
            🔔
          </div>
          <h3 className="font-extrabold text-slate-800 text-base">
            {searchTerm ? 'No notifications found.' : activeTab === 'unread' ? 'No unread notifications.' : 'No Notifications'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            {searchTerm ? 'Try searching for a different keyword or category.' : "You're all caught up! Updates regarding appointments, orders, and security will appear here."}
          </p>
        </div>
      )}

      {/* Notification Details Modal */}
      {detailModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-[10px] font-extrabold text-teal-700 uppercase tracking-wider bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                {detailModal.category}
              </span>
              <button onClick={() => setDetailModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-black text-slate-900">{detailModal.title}</h2>
              <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {detailModal.fullDescription}
              </p>

              <div className="grid grid-cols-2 gap-3 bg-slate-50/60 p-3 rounded-xl border border-slate-100 font-semibold text-slate-600">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Date & Time</span>
                  <span>{detailModal.date} • {detailModal.time}</span>
                </div>
                {detailModal.relatedService && (
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Related Service</span>
                    <span className="text-teal-700 font-extrabold">{detailModal.relatedService}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>

              {detailModal.navigationPath && (
                <button
                  type="button"
                  onClick={() => handleNavigateToService(detailModal)}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  Go to Related Service <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Delete Notification Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" /> Delete Notification?
              </h3>
              <button onClick={() => setDeleteModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-600 font-semibold">
              Are you sure you want to delete <strong className="text-slate-800">{deleteModal.title}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Notifications Modal */}
      {clearAllModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base text-rose-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" /> Clear All Notifications?
              </h3>
              <button onClick={() => setClearAllModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-600 font-semibold">
              This will remove all notifications from your notification center. Your bookings, orders, and account data will remain unaffected.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClearAllModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
