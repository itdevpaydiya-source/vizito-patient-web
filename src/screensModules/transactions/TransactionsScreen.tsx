import React, { useState, useMemo } from 'react';
import {
  Download,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  X,
  Eye,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
type PaymentStatus = 'Success' | 'Pending' | 'Failed' | 'Cancelled' | 'Refunded' | 'Partial Refund';

interface TransactionItem {
  id: string; // TXNxxxxx
  apptId: string; // APTxxxxx
  patientName: string;
  mobile: string;
  consultationType: 'Walk-In' | 'In-Clinic' | 'Video Consultation' | 'Home Visit';
  paymentMethod: 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Wallet' | 'Cash' | 'QR Code';
  paymentReference: string;
  receiptNumber: string;
  grossAmount: number;
  status: PaymentStatus;
  clinic: string;
  dateTime: string; // YYYY-MM-DD HH:MM
  displayDateTime: string; // DD MMM HH:MM AM/PM
}

const INITIAL_TRANSACTIONS: TransactionItem[] = [
  {
    id: 'TXN10001',
    apptId: 'APT2001',
    patientName: 'Amit Sharma',
    mobile: '9876543210',
    consultationType: 'In-Clinic',
    paymentMethod: 'UPI',
    paymentReference: 'REF-998234',
    receiptNumber: 'REC-098234',
    grossAmount: 1000,
    status: 'Success',
    clinic: 'Apollo Hospital',
    dateTime: '2026-07-12 10:00',
    displayDateTime: '12 Jul 2026 10:00 AM'
  },
  {
    id: 'TXN10002',
    apptId: 'APT2002',
    patientName: 'Priya Singh',
    mobile: '9876543211',
    consultationType: 'Video Consultation',
    paymentMethod: 'Credit Card',
    paymentReference: 'REF-887123',
    receiptNumber: 'REC-098235',
    grossAmount: 800,
    status: 'Success',
    clinic: 'Apollo Hospital',
    dateTime: '2026-07-14 09:30',
    displayDateTime: '14 Jul 2026 09:30 AM'
  },
  {
    id: 'TXN10003',
    apptId: 'APT2003',
    patientName: 'Ramesh Kumar',
    mobile: '9876543212',
    consultationType: 'In-Clinic',
    paymentMethod: 'UPI',
    paymentReference: 'REF-776512',
    receiptNumber: 'REC-098236',
    grossAmount: 1000,
    status: 'Pending',
    clinic: 'Apollo Hospital',
    dateTime: '2026-07-14 11:00',
    displayDateTime: '14 Jul 2026 11:00 AM'
  },
  {
    id: 'TXN10004',
    apptId: 'APT2004',
    patientName: 'Neha Devi',
    mobile: '9876543213',
    consultationType: 'Home Visit',
    paymentMethod: 'Net Banking',
    paymentReference: 'REF-665123',
    receiptNumber: 'REC-098237',
    grossAmount: 1500,
    status: 'Success',
    clinic: 'Apollo Hospital',
    dateTime: '2026-07-13 16:00',
    displayDateTime: '13 Jul 2026 04:00 PM'
  },
  {
    id: 'TXN10005',
    apptId: 'APT2005',
    patientName: 'Vikram Singh',
    mobile: '9876543214',
    consultationType: 'Video Consultation',
    paymentMethod: 'UPI',
    paymentReference: 'REF-554213',
    receiptNumber: '—',
    grossAmount: 800,
    status: 'Failed',
    clinic: 'Apollo Hospital',
    dateTime: '2026-07-10 10:00',
    displayDateTime: '10 Jul 2026 10:00 AM'
  },
  {
    id: 'TXN10006',
    apptId: 'APT2006',
    patientName: 'Anjali Patel',
    mobile: '9876543215',
    consultationType: 'In-Clinic',
    paymentMethod: 'Debit Card',
    paymentReference: 'REF-443219',
    receiptNumber: 'REC-098238',
    grossAmount: 1000,
    status: 'Refunded',
    clinic: 'Apollo Hospital',
    dateTime: '2026-07-09 02:00',
    displayDateTime: '09 Jul 2026 02:00 PM'
  },
  {
    id: 'TXN10007',
    apptId: 'APT2007',
    patientName: 'Mohit Jain',
    mobile: '9876543216',
    consultationType: 'Video Consultation',
    paymentMethod: 'Wallet',
    paymentReference: 'REF-332198',
    receiptNumber: '—',
    grossAmount: 800,
    status: 'Cancelled',
    clinic: 'Apollo Hospital',
    dateTime: '2026-07-14 11:30',
    displayDateTime: '14 Jul 2026 11:30 AM'
  },
  {
    id: 'TXN10008',
    apptId: 'APT2008',
    patientName: 'Sneha Sharma',
    mobile: '9876543217',
    consultationType: 'In-Clinic',
    paymentMethod: 'UPI',
    paymentReference: 'REF-221098',
    receiptNumber: 'REC-098239',
    grossAmount: 1000,
    status: 'Success',
    clinic: 'Care Clinic Banjara',
    dateTime: '2026-07-14 08:30',
    displayDateTime: '14 Jul 2026 08:30 AM'
  }
];

export default function TransactionsScreen() {
  const navigate = useNavigate();

  // Transactions database
  const [transactions] = useState<TransactionItem[]>(INITIAL_TRANSACTIONS);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Last Month' | 'Custom'>('This Month');
  const [customStartDate, setCustomStartDate] = useState('2026-07-01');
  const [customEndDate, setCustomEndDate] = useState('2026-07-31');

  const [consultationTypeFilter, setConsultationTypeFilter] = useState<'All' | 'Walk-In' | 'In-Clinic' | 'Video Consultation' | 'Home Visit'>('All');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'All' | 'Success' | 'Pending' | 'Failed' | 'Cancelled' | 'Refunded' | 'Partial Refund'>('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'All' | 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Wallet' | 'Cash' | 'QR Code'>('All');
  const [clinicFilter, setClinicFilter] = useState<'All' | 'Apollo Hospital' | 'Care Clinic Banjara'>('All');
  const [sortOrder, setSortOrder] = useState<'Latest First' | 'Oldest First' | 'Highest Amount' | 'Lowest Amount'>('Latest First');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<20 | 50 | 100>(20);

  // Modals state
  const [viewingTxn, setViewingTxn] = useState<TransactionItem | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateFilter('This Month');
    setConsultationTypeFilter('All');
    setPaymentStatusFilter('All');
    setPaymentMethodFilter('All');
    setClinicFilter('All');
    setSortOrder('Latest First');
    setCurrentPage(1);
    showToast('Filters reset to default.', 'info');
  };

  const triggerExport = (format: 'PDF' | 'Excel') => {
    setIsExportModalOpen(false);
    showToast(`Successfully compiled and exported ${filteredTransactions.length} records to ${format} format.`, 'success');
  };

  const handleDownloadReceipt = (txn: TransactionItem) => {
    showToast(`Receipt PDF for transaction ${txn.id} downloaded successfully.`, 'success');
  };

  // ─── Filter Calculations ────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Search Box validation ($\ge 3$ characters required)
      if (searchQuery.trim().length >= 3) {
        const query = searchQuery.toLowerCase();
        const matchesId = t.id.toLowerCase().includes(query);
        const matchesAppt = t.apptId.toLowerCase().includes(query);
        const matchesPatient = t.patientName.toLowerCase().includes(query);
        const matchesMobile = t.mobile.includes(query);
        const matchesRef = t.paymentReference.toLowerCase().includes(query);
        const matchesRec = t.receiptNumber.toLowerCase().includes(query);
        if (!matchesId && !matchesAppt && !matchesPatient && !matchesMobile && !matchesRef && !matchesRec) return false;
      }

      // 2. Consultation type
      if (consultationTypeFilter !== 'All' && t.consultationType !== consultationTypeFilter) return false;

      // 3. Payment Status
      if (paymentStatusFilter !== 'All' && t.status !== paymentStatusFilter) return false;

      // 4. Payment Method
      if (paymentMethodFilter !== 'All' && t.paymentMethod !== paymentMethodFilter) return false;

      // 5. Clinic Filter
      if (clinicFilter !== 'All' && t.clinic !== clinicFilter) return false;

      // 6. Date period
      const txnDate = new Date(t.dateTime.split(' ')[0]);
      if (dateFilter === 'Today') {
        return t.dateTime.startsWith('2026-07-14');
      }
      if (dateFilter === 'Yesterday') {
        return t.dateTime.startsWith('2026-07-13');
      }
      if (dateFilter === 'This Week') {
        const day = txnDate.getDate();
        return day >= 12 && day <= 18; // 12-18 July 2026
      }
      if (dateFilter === 'This Month') {
        return t.dateTime.startsWith('2026-07');
      }
      if (dateFilter === 'Last Month') {
        return t.dateTime.startsWith('2026-06');
      }
      if (dateFilter === 'Custom') {
        const start = new Date(customStartDate).getTime();
        const end = new Date(customEndDate).getTime();
        const txSec = txnDate.getTime();
        return txSec >= start && txSec <= end;
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === 'Latest First') {
        return new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime();
      }
      if (sortOrder === 'Oldest First') {
        return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
      }
      if (sortOrder === 'Highest Amount') {
        return b.grossAmount - a.grossAmount;
      }
      if (sortOrder === 'Lowest Amount') {
        return a.grossAmount - b.grossAmount;
      }
      return 0;
    });
  }, [transactions, searchQuery, dateFilter, customStartDate, customEndDate, consultationTypeFilter, paymentStatusFilter, paymentMethodFilter, clinicFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Card Counters
  const countTotal = transactions.length;
  const countSuccess = transactions.filter(t => t.status === 'Success').length;
  const countPending = transactions.filter(t => t.status === 'Pending').length;
  const countFailed = transactions.filter(t => t.status === 'Failed').length;

  return (
    <div className="space-y-6">
      
      {/* Toast Notifier */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade flex items-center gap-3 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl max-w-sm">
          <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-teal-400" />
          <p className="text-xs font-bold leading-normal text-white">{toast.message}</p>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2B2B2B] tracking-tight font-sans">Payment Transactions</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Audit complete patient ledger histories, payment methods, and receipts</p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-750 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export Payments
          </button>
        </div>
      </div>

      {/* Summary metric filter cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Transactions', val: countTotal, color: 'bg-purple-50 text-[#7C3AED]', filterAction: () => { handleResetFilters(); } },
          { title: 'Successful Payments', val: countSuccess, color: 'bg-emerald-50 text-emerald-700', filterAction: () => { setPaymentStatusFilter('Success'); setCurrentPage(1); } },
          { title: 'Pending Confirmation', val: countPending, color: 'bg-amber-50 text-amber-600', filterAction: () => { setPaymentStatusFilter('Pending'); setCurrentPage(1); } },
          { title: 'Failed Failures', val: countFailed, color: 'bg-rose-50 text-rose-600', filterAction: () => { setPaymentStatusFilter('Failed'); setCurrentPage(1); } }
        ].map(card => (
          <div
            key={card.title}
            onClick={card.filterAction}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-[#5C2494]/30 hover:shadow-md transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.title}</span>
            <div className="flex items-baseline justify-between mt-2">
              <h4 className="text-xl font-black text-slate-800">{card.val}</h4>
              <span className={`text-[9px] font-black ${card.color} px-1.5 py-0.5 rounded`}>Filter List</span>
            </div>
          </div>
        ))}
      </div>

      {/* Table & Filters Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
        
        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-4.5 rounded-xl border border-slate-150">
          <div>
            <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Search Keywords</label>
            <div className="relative bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full bg-transparent text-xs font-semibold outline-none"
              />
            </div>
            {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
              <span className="text-[9px] text-rose-500 font-bold mt-1 block">Min 3 characters required.</span>
            )}
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Consultation Type</label>
            <select
              value={consultationTypeFilter}
              onChange={e => { setConsultationTypeFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="All">All Formats</option>
              <option value="Walk-In">Walk-In</option>
              <option value="In-Clinic">In-Clinic</option>
              <option value="Video Consultation">Video Consultation</option>
              <option value="Home Visit">Home Visit</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-455 uppercase mb-1">Payment Status</label>
            <select
              value={paymentStatusFilter}
              onChange={e => { setPaymentStatusFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Success">Success</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Refunded">Refunded</option>
              <option value="Partial Refund">Partial Refund</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-455 uppercase mb-1">Payment Method</label>
            <select
              value={paymentMethodFilter}
              onChange={e => { setPaymentMethodFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="All">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Net Banking">Net Banking</option>
              <option value="Wallet">Wallet</option>
              <option value="Cash">Cash</option>
              <option value="QR Code">QR Code</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-455 uppercase mb-1">Sort In Order</label>
            <select
              value={sortOrder}
              onChange={e => { setSortOrder(e.target.value as any); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="Latest First">Latest First</option>
              <option value="Oldest First">Oldest First</option>
              <option value="Highest Amount">Highest Amount</option>
              <option value="Lowest Amount">Lowest Amount</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-455 uppercase mb-1">Clinic Selection</label>
            <select
              value={clinicFilter}
              onChange={e => { setClinicFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="All">All Clinics</option>
              <option value="Apollo Hospital">Apollo Hospital</option>
              <option value="Care Clinic Banjara">Care Clinic Banjara</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-455 uppercase mb-1">Date Period</label>
            <select
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
            >
              <option value="This Month">This Month</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="Last Month">Last Month</option>
              <option value="Custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === 'Custom' && (
            <div className="sm:col-span-2 flex items-center gap-1.5 mt-2 bg-white border border-slate-200 p-2 rounded-lg">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="bg-transparent text-xs font-semibold"
              />
              <span className="text-[10px] text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="bg-transparent text-xs font-semibold"
              />
            </div>
          )}

          <div className="flex items-end">
            {(searchQuery || dateFilter !== 'This Month' || consultationTypeFilter !== 'All' || paymentStatusFilter !== 'All' || paymentMethodFilter !== 'All' || clinicFilter !== 'All') && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-black text-rose-650 hover:underline py-2.5"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto min-w-[900px]">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-3">Transaction Date</th>
                <th className="p-3">Transaction ID</th>
                <th className="p-3">Appointment ID</th>
                <th className="p-3">Patient Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Payment Method</th>
                <th className="p-3 text-right">Gross Paid</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">No transactions available.</td>
                </tr>
              ) : (
                paginatedTransactions.map(txn => (
                  <tr key={txn.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-slate-500">{txn.displayDateTime}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{txn.id}</td>
                    <td className="p-3 font-mono text-slate-650">{txn.apptId}</td>
                    <td className="p-3 font-black text-slate-800">{txn.patientName}</td>
                    <td className="p-3 text-slate-550">{txn.consultationType}</td>
                    <td className="p-3 text-slate-600">{txn.paymentMethod}</td>
                    <td className="p-3 text-right text-slate-900 font-black">₹{txn.grossAmount}</td>
                    <td className="p-3">
                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        txn.status === 'Success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                        txn.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        txn.status === 'Failed' ? 'bg-rose-50 text-rose-500 border border-rose-200' :
                        'bg-slate-100 text-slate-550'
                      }`}>
                        {txn.status}
                      </span>
                    </td>
                    <td className="p-3 text-right flex justify-end gap-1.5">
                      <button
                        onClick={() => setViewingTxn(txn)}
                        className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownloadReceipt(txn)}
                        className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded"
                        title="Download Receipt"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination sizing row */}
        {filteredTransactions.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs bg-slate-50 px-4 py-2 rounded-xl text-slate-600 font-bold">
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
              <span className="font-bold text-slate-650">Page {currentPage} of {totalPages}</span>
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

      {/* DETAIL AUDIT DIALOG */}
      {viewingTxn && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setViewingTxn(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4 animate-fade"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Transaction Details Audit</h3>
              <button onClick={() => setViewingTxn(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Payment Section */}
              <div className="space-y-2 text-xs font-semibold text-slate-650">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transaction Identifiers</span>
                <div>Transaction ID: <span className="font-mono font-bold text-slate-850">{viewingTxn.id}</span></div>
                <div>Payment Ref Number: <span className="font-mono text-slate-800">{viewingTxn.paymentReference}</span></div>
                <div>Receipt Document Number: <span className="font-mono text-slate-800">{viewingTxn.receiptNumber}</span></div>
                <div>Date &amp; Time Log: <span className="font-bold text-slate-850">{viewingTxn.displayDateTime}</span></div>
                <div>Payment Channel: <span className="font-bold text-slate-800">{viewingTxn.paymentMethod}</span></div>
                <div>Gross Amount Paid: <span className="font-black text-slate-900 text-sm">₹{viewingTxn.grossAmount}</span></div>
                <div>Transaction Status: <span className="font-bold text-slate-800">{viewingTxn.status}</span></div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Appointment Section */}
              <div className="space-y-2 text-xs font-semibold text-slate-655">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Linked Appointment Details</span>
                <div>Appointment ID: <span className="font-mono text-slate-800">{viewingTxn.apptId}</span></div>
                <div>Patient Full Name: <span className="font-bold text-slate-850">{viewingTxn.patientName}</span></div>
                <div>Consultation Format: <span className="font-bold text-slate-800">{viewingTxn.consultationType}</span></div>
                <div>Associated Clinic: <span className="font-bold text-slate-800">{viewingTxn.clinic}</span></div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                onClick={() => handleDownloadReceipt(viewingTxn)}
                className="flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors cursor-pointer animate-fade"
              >
                <FileText className="w-4 h-4" /> Download Receipt
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setViewingTxn(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-655"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setViewingTxn(null);
                    navigate('/appointments');
                  }}
                  className="bg-[#5C2494] text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm flex items-center gap-1"
                >
                  View Appt <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT OPTIONS MODAL */}
      {isExportModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsExportModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-bold text-slate-800">Export Filtered Ledger</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Select file output format</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => triggerExport('PDF')}
                className="flex flex-col items-center justify-center gap-2 border border-slate-200 hover:border-purple-300 p-4 rounded-xl hover:bg-slate-50/50"
              >
                <FileText className="w-8 h-8 text-rose-500" />
                <span className="text-xs font-bold text-slate-700">PDF Document</span>
              </button>

              <button
                onClick={() => triggerExport('Excel')}
                className="flex flex-col items-center justify-center gap-2 border border-slate-200 hover:border-purple-300 p-4 rounded-xl hover:bg-slate-50/50"
              >
                <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700">Excel Spreadsheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
