import React, { useState, useEffect, useMemo } from 'react';
import { 
  Check, MoreVertical, CalendarClock, Calendar, Wallet, Star, Video, 
  FileText, ShieldCheck, Megaphone, User, Filter, ChevronLeft, ChevronRight,
  ChevronDown, ArrowRight, BellRing, Search, X, Trash2, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string; // display timestamp
  timestamp: string; // ISO format for sorting
  unread: boolean;
  category: 'Appointment' | 'Consultation' | 'Prescription' | 'Settlement' | 'Availability' | 'Profile' | 'System';
  targetId?: string; // Links to record IDs
  priority: 'high' | 'normal';
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'NOTIF-001',
    title: 'New Appointment Booked',
    desc: 'A new In-Clinic appointment is booked with Amit Sharma on 14 Jul 2026 at 11:30 AM.',
    time: '5 mins ago',
    timestamp: '2026-07-14T10:36:00',
    unread: true,
    category: 'Appointment',
    targetId: 'APT2001',
    priority: 'high'
  },
  {
    id: 'NOTIF-002',
    title: 'Appointment Cancelled',
    desc: 'Priya Singh cancelled today\'s video consultation appointment (APT2002).',
    time: '1 hour ago',
    timestamp: '2026-07-14T09:41:00',
    unread: true,
    category: 'Appointment',
    targetId: 'APT2002',
    priority: 'high'
  },
  {
    id: 'NOTIF-003',
    title: 'Consultation Started',
    desc: 'Consultation record APT2003 has been started for Ramesh Kumar.',
    time: '2 hours ago',
    timestamp: '2026-07-14T08:41:00',
    unread: true,
    category: 'Consultation',
    targetId: 'APT2003',
    priority: 'normal'
  },
  {
    id: 'NOTIF-004',
    title: 'Prescription Shared',
    desc: 'Prescription RX-2026-0007 has been shared successfully with patient Amit Sharma.',
    time: '3 hours ago',
    timestamp: '2026-07-14T07:41:00',
    unread: true,
    category: 'Prescription',
    targetId: 'RX-2026-0007',
    priority: 'normal'
  },
  {
    id: 'NOTIF-005',
    title: 'Settlement Completed',
    desc: 'Settlement request of ₹5000 (SET1001) has been credited to your bank account.',
    time: 'Yesterday, 04:30 PM',
    timestamp: '2026-07-13T16:30:00',
    unread: false,
    category: 'Settlement',
    targetId: 'SET1001',
    priority: 'high'
  },
  {
    id: 'NOTIF-006',
    title: 'Availability Approved',
    desc: 'Apollo Hospital has approved your requested weekly availability shifts.',
    time: 'Yesterday, 11:15 AM',
    timestamp: '2026-07-13T11:15:00',
    unread: false,
    category: 'Availability',
    targetId: 'AV-001',
    priority: 'high'
  },
  {
    id: 'NOTIF-007',
    title: 'KYC Approved',
    desc: 'Your visual KYC validation documents have been successfully verified by administration.',
    time: '2 days ago',
    timestamp: '2026-07-12T14:20:00',
    unread: false,
    category: 'Profile',
    targetId: 'Verification',
    priority: 'high'
  },
  {
    id: 'NOTIF-008',
    title: 'Application Update',
    desc: 'Viziito Doctor Platform updated to version 4.5. New prescriptions editor features released.',
    time: '3 days ago',
    timestamp: '2026-07-11T09:00:00',
    unread: false,
    category: 'System',
    priority: 'normal'
  }
];

export default function NotificationsScreen() {
  const navigate = useNavigate();

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Unread' | 'Read'>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Appointment' | 'Consultation' | 'Prescription' | 'Settlement' | 'Availability' | 'Profile' | 'System'>('All');
  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month'>('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<20 | 50 | 100>(20);

  // Modals state
  const [isMarkReadConfirmOpen, setIsMarkReadConfirmOpen] = useState(false);
  const [viewingNotif, setViewingNotif] = useState<NotificationItem | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sync / Load
  useEffect(() => {
    const saved = localStorage.getItem('vizito_notifications');
    if (saved) {
      setNotifications(JSON.parse(saved));
    } else {
      setNotifications(INITIAL_NOTIFICATIONS);
      localStorage.setItem('vizito_notifications', JSON.stringify(INITIAL_NOTIFICATIONS));
    }
  }, []);

  const syncNotifications = (updated: NotificationItem[]) => {
    setNotifications(updated);
    localStorage.setItem('vizito_notifications', JSON.stringify(updated));
  };

  // Actions
  const handleMarkAllRead = () => {
    const unreadExist = notifications.some(n => n.unread);
    if (!unreadExist) {
      showToast('All notifications are already read.', 'info');
      setIsMarkReadConfirmOpen(false);
      return;
    }
    const updated = notifications.map(n => ({ ...n, unread: false }));
    syncNotifications(updated);
    setIsMarkReadConfirmOpen(false);
    showToast('All notifications marked as read.', 'success');
  };

  const handleMarkSingleRead = (id: string, readState: boolean) => {
    const updated = notifications.map(n => n.id === id ? { ...n, unread: readState } : n);
    syncNotifications(updated);
    showToast(`Notification marked as ${readState ? 'unread' : 'read'}.`, 'success');
  };

  const handleDeleteNotif = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    syncNotifications(updated);
    if (viewingNotif?.id === id) setViewingNotif(null);
    showToast('Notification deleted permanently.', 'info');
  };

  const handleOpenRelatedRecord = (notif: NotificationItem) => {
    // Mark as read first
    if (notif.unread) {
      const updated = notifications.map(n => n.id === notif.id ? { ...n, unread: false } : n);
      syncNotifications(updated);
    }
    setViewingNotif(null);

    // Redirect mapping
    if (notif.category === 'Appointment') {
      navigate('/appointments');
    } else if (notif.category === 'Consultation') {
      navigate('/appointments');
    } else if (notif.category === 'Prescription') {
      navigate('/prescriptions');
    } else if (notif.category === 'Settlement') {
      navigate('/revenue');
    } else if (notif.category === 'Availability') {
      navigate('/availability');
    } else if (notif.category === 'Profile') {
      navigate('/profile');
    } else {
      // System goes to notification details, which is viewingNotif modal (already done)
      setViewingNotif(notif);
    }
  };

  // Search auto filter (respects >= 3 characters condition)
  const filtered = useMemo(() => {
    return notifications.filter(n => {
      // Search Box matching min 3 character auto filter
      if (searchQuery.trim().length >= 3) {
        const query = searchQuery.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(query);
        const matchDesc = n.desc.toLowerCase().includes(query);
        const matchTarget = n.targetId ? n.targetId.toLowerCase().includes(query) : false;
        if (!matchTitle && !matchDesc && !matchTarget) return false;
      }

      // Status filter
      if (statusFilter === 'Unread' && !n.unread) return false;
      if (statusFilter === 'Read' && n.unread) return false;

      // Category filter
      if (categoryFilter !== 'All' && n.category !== categoryFilter) return false;

      // Date filter
      const notifDate = new Date(n.timestamp);
      const isToday = n.timestamp.startsWith('2026-07-14');
      const isYesterday = n.timestamp.startsWith('2026-07-13');
      
      if (dateFilter === 'Today' && !isToday) return false;
      if (dateFilter === 'Yesterday' && !isYesterday) return false;
      if (dateFilter === 'This Week') {
        const day = notifDate.getDate();
        if (day < 12 || day > 18) return false;
      }
      if (dateFilter === 'This Month') {
        if (!n.timestamp.startsWith('2026-07')) return false;
      }

      return true;
    }).sort((a, b) => {
      // Default sorting: Latest First. If timestamp same, Unread first.
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      if (timeB !== timeA) return timeB - timeA;
      if (a.unread && !b.unread) return -1;
      if (!a.unread && b.unread) return 1;
      return 0;
    });
  }, [notifications, searchQuery, statusFilter, categoryFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const categoryIcons: Record<NotificationItem['category'], any> = {
    Appointment: CalendarClock,
    Consultation: Video,
    Prescription: FileText,
    Settlement: Wallet,
    Availability: Calendar,
    Profile: User,
    System: ShieldCheck
  };

  const categoryBg: Record<NotificationItem['category'], string> = {
    Appointment: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Consultation: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    Prescription: 'bg-rose-50 text-rose-700 border-rose-100',
    Settlement: 'bg-blue-50 text-blue-700 border-blue-100',
    Availability: 'bg-purple-50 text-purple-700 border-purple-100',
    Profile: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
    System: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <div className="w-full animate-fade flex flex-col gap-0 min-h-0">
      
      {/* Toast Notifier */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade flex items-center gap-3 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl max-w-sm">
          <Check className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="text-xs font-bold leading-normal">{toast.message}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2B2B2B] tracking-tight">Notification Center</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Review alerts, updates, profile approvals, and hospital requests status</p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={() => setIsMarkReadConfirmOpen(true)}
              className="flex items-center gap-2 bg-[#FAF5FF] hover:bg-[#F3E8FF] text-[#5C2494] border border-[#5C2494]/25 px-4 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all"
            >
              <Check className="w-4 h-4" />
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Search Notifications</label>
            <div className="relative bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full bg-transparent border-none text-xs font-bold text-slate-700 outline-none placeholder:text-slate-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
              <span className="text-[9px] text-rose-500 font-bold mt-1 block">Please type at least 3 characters.</span>
            )}
          </div>

          {/* Status Dropdown */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-650 outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Unread">Unread Only</option>
              <option value="Read">Read Only</option>
            </select>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category Filter</label>
            <select
              value={categoryFilter}
              onChange={e => { setCategoryFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-655 outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Appointment">Appointment</option>
              <option value="Consultation">Consultation</option>
              <option value="Prescription">Prescription</option>
              <option value="Settlement">Settlement</option>
              <option value="Availability">Availability</option>
              <option value="Profile">Profile</option>
              <option value="System">System</option>
            </select>
          </div>

          {/* Date range filter */}
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date Period</label>
            <select
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-655 outline-none cursor-pointer"
            >
              <option value="All">All Dates</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            {(searchQuery || statusFilter !== 'All' || categoryFilter !== 'All' || dateFilter !== 'All') && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-black text-rose-600 hover:underline py-2.5"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main List Layout */}
      <div className="bg-white border border-[#DEDFE0] rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="divide-y divide-slate-100">
          {paginated.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No notifications available.</p>
            </div>
          ) : (
            paginated.map(notif => {
              const Icon = categoryIcons[notif.category] || ShieldCheck;
              const bgStyle = categoryBg[notif.category] || 'bg-slate-50';

              return (
                <div
                  key={notif.id}
                  onClick={() => setViewingNotif(notif)}
                  className={`flex items-start gap-4 p-4 cursor-pointer hover:bg-slate-50/50 transition-colors border-l-4 ${notif.unread ? 'bg-[#FAF5FF]/10 border-l-[#5C2494]' : 'border-l-transparent'}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs shrink-0 ${bgStyle}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-xs font-black ${notif.unread ? 'text-slate-900' : 'text-slate-650'}`}>{notif.title}</h4>
                    <p className={`text-[11px] mt-1 leading-relaxed ${notif.unread ? 'text-slate-750 font-semibold' : 'text-slate-500'}`}>{notif.desc}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded">
                        {notif.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2.5 pt-0.5 relative" onClick={e => e.stopPropagation()}>
                    <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{notif.time}</span>
                    <div className="flex items-center gap-1.5">
                      {notif.unread && (
                        <span className="w-2.5 h-2.5 bg-purple-600 rounded-full shrink-0" />
                      )}
                      <button
                        onClick={() => {
                          setActiveMenuId(activeMenuId === notif.id ? null : notif.id);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Action dropdown */}
                    {activeMenuId === notif.id && (
                      <div className="absolute right-0 top-7 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 text-left animate-fade">
                        <button
                          onClick={() => {
                            handleMarkSingleRead(notif.id, !notif.unread);
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Mark as {notif.unread ? 'Read' : 'Unread'}
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteNotif(notif.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border-t border-slate-100 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination toolbar */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(parseInt(e.target.value) as any); setCurrentPage(1); }}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none font-bold"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 border border-slate-200 rounded bg-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-slate-600">Page {currentPage} of {totalPages}</span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1 border border-slate-200 rounded bg-white disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── MODALS ────────────────────────────────────────────────────────── */}

      {/* MARK ALL AS READ CONFIRMATION DIALOG */}
      {isMarkReadConfirmOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsMarkReadConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Check className="w-5 h-5 text-purple-700" /> Confirm Operation
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mt-2">
                Are you sure you want to mark all unread notifications as read? This operation cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                onClick={() => setIsMarkReadConfirmOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-650 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAllRead}
                className="bg-gradient-to-r from-[#5C2494] to-[#7C3AED] text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm"
              >
                Confirm Read All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED VIEW MODAL */}
      {viewingNotif && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setViewingNotif(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">{viewingNotif.title}</h3>
              <button onClick={() => setViewingNotif(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-semibold text-slate-650">
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block">
                {viewingNotif.category}
              </span>
              <p className="text-xs text-slate-650 leading-relaxed font-semibold">{viewingNotif.desc}</p>
              <div className="text-[10px] text-slate-400 font-bold">Received: {viewingNotif.time}</div>
            </div>

            <div className="flex justify-between items-center pt-3.5 border-t border-slate-100">
              <button
                onClick={() => handleDeleteNotif(viewingNotif.id)}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete Alert
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setViewingNotif(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-650"
                >
                  Close
                </button>
                {viewingNotif.category !== 'System' && (
                  <button
                    onClick={() => handleOpenRelatedRecord(viewingNotif)}
                    className="bg-[#5C2494] text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5"
                  >
                    Open Record <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Reset helper
const handleResetFilters = () => {
  // handled inside component state
};
