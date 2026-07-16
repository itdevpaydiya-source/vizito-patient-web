import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Percent,
  Wallet,
  CalendarCheck,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Eye,
  Building2,
  AlertCircle,
  Info,
  X,
  Check,
  Search,
  Loader2,
  FileText,
  SlidersHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────
type SettlementStatus = 'Available' | 'Requested' | 'Processing' | 'Settled' | 'Rejected' | 'Pending'; // Pending is for future appointments

interface RevenueTransaction {
  id: string;
  apptId: string;
  patientName: string;
  consultationType: 'Walk-In' | 'In-Clinic' | 'Video Consultation' | 'Home Visit';
  apptDateTime: string; // Format: "YYYY-MM-DD HH:mm" for logic check
  apptDisplayDate: string; // display string
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: SettlementStatus;
  clinic: string;
}

interface SettlementRequest {
  id: string;
  requestDate: string;
  requestedAmount: number;
  processedDate: string;
  status: 'Requested' | 'Processing' | 'Settled' | 'Rejected';
  referenceNumber: string;
  bankAccount: string;
  remarks?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const VIRTUAL_TODAY = new Date('2026-07-14T10:41:00'); // Virtual Today: July 14, 2026 10:41 AM

const INITIAL_TRANSACTIONS: RevenueTransaction[] = [
  { id: 'TX1001', apptId: 'APT2001', patientName: 'Amit Sharma', consultationType: 'In-Clinic', apptDateTime: '2026-07-12 10:00', apptDisplayDate: '12 Jul 2026 10:00 AM', grossAmount: 1000, platformFee: 150, netAmount: 850, status: 'Available', clinic: 'Apollo Hospital' },
  { id: 'TX1002', apptId: 'APT2002', patientName: 'Priya Singh', consultationType: 'Video Consultation', apptDateTime: '2026-07-14 09:30', apptDisplayDate: '14 Jul 2026 09:30 AM', grossAmount: 800, platformFee: 120, netAmount: 680, status: 'Available', clinic: 'Apollo Hospital' },
  { id: 'TX1003', apptId: 'APT2003', patientName: 'Ramesh Kumar', consultationType: 'In-Clinic', apptDateTime: '2026-07-15 11:00', apptDisplayDate: '15 Jul 2026 11:00 AM', grossAmount: 1000, platformFee: 150, netAmount: 850, status: 'Pending', clinic: 'Apollo Hospital' }, // Future date
  { id: 'TX1004', apptId: 'APT2004', patientName: 'Neha Devi', consultationType: 'Home Visit', apptDateTime: '2026-07-13 16:00', apptDisplayDate: '13 Jul 2026 04:00 PM', grossAmount: 1500, platformFee: 225, netAmount: 1275, status: 'Settled', clinic: 'Apollo Hospital' },
  { id: 'TX1005', apptId: 'APT2005', patientName: 'Vikram Singh', consultationType: 'Video Consultation', apptDateTime: '2026-07-10 10:00', apptDisplayDate: '10 Jul 2026 10:00 AM', grossAmount: 800, platformFee: 120, netAmount: 680, status: 'Requested', clinic: 'Apollo Hospital' },
  { id: 'TX1006', apptId: 'APT2006', patientName: 'Anjali Patel', consultationType: 'In-Clinic', apptDateTime: '2026-07-09 14:00', apptDisplayDate: '09 Jul 2026 02:00 PM', grossAmount: 1000, platformFee: 150, netAmount: 850, status: 'Rejected', clinic: 'Apollo Hospital' },
  { id: 'TX1007', apptId: 'APT2007', patientName: 'Mohit Jain', consultationType: 'Video Consultation', apptDateTime: '2026-07-14 11:30', apptDisplayDate: '14 Jul 2026 11:30 AM', grossAmount: 800, platformFee: 120, netAmount: 680, status: 'Pending', clinic: 'Apollo Hospital' }, // Future time today
  { id: 'TX1008', apptId: 'APT2008', patientName: 'Sneha Sharma', consultationType: 'In-Clinic', apptDateTime: '2026-07-14 08:30', apptDisplayDate: '14 Jul 2026 08:30 AM', grossAmount: 1000, platformFee: 150, netAmount: 850, status: 'Available', clinic: 'Care Clinic Banjara' }
];

const INITIAL_SETTLEMENTS: SettlementRequest[] = [
  { id: 'SET1001', requestDate: '11 Jul 2026', requestedAmount: 5000, processedDate: '12 Jul 2026', status: 'Settled', referenceNumber: 'REF-992834', bankAccount: 'HDFC Bank **** 5678' },
  { id: 'SET1002', requestDate: '13 Jul 2026', requestedAmount: 2000, processedDate: '—', status: 'Requested', referenceNumber: '—', bankAccount: 'HDFC Bank **** 5678' },
  { id: 'SET1003', requestDate: '09 Jul 2026', requestedAmount: 1500, processedDate: '10 Jul 2026', status: 'Rejected', referenceNumber: '—', bankAccount: 'HDFC Bank **** 5678', remarks: 'KYC documents not clear.' }
];

export default function RevenueScreen() {
  const navigate = useNavigate();

  // Tab views
  const [activeViewTab, setActiveViewTab] = useState<'Overview' | 'Transactions' | 'Settlement History'>('Overview');

  // Database lists
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
  const [settlementHistory, setSettlementHistory] = useState<SettlementRequest[]>([]);

  // Verification Settings
  const kycApproved = true;
  const bankDetailsVerified = true;
  const bankAccount = 'HDFC Bank **** 5678';

  // Filters state
  const [dateFilter, setDateFilter] = useState<'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Last Month' | 'Custom'>('This Month');
  const [customStartDate, setCustomStartDate] = useState('2026-07-01');
  const [customEndDate, setCustomEndDate] = useState('2026-07-31');
  
  const [clinicFilter, setClinicFilter] = useState<'All' | 'Apollo Hospital' | 'Care Clinic Banjara'>('All');
  const [consultationTypeFilter, setConsultationTypeFilter] = useState<'All' | 'Walk-In' | 'In-Clinic' | 'Video Consultation' | 'Home Visit'>('All');
  const [revenueStatusFilter, setRevenueStatusFilter] = useState<'All' | 'Available' | 'Requested' | 'Processing' | 'Settled' | 'Rejected'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<20 | 50 | 100>(20);

  // Modal displays
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [viewingTxn, setViewingTxn] = useState<RevenueTransaction | null>(null);
  const [viewingSettlement, setViewingSettlement] = useState<SettlementRequest | null>(null);

  // Settlement Request Field
  const [settlementRequestAmount, setSettlementRequestAmount] = useState('');

  // Toast notifier
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Lifecycle loading & dynamic date eligibility checker ───────────────────
  useEffect(() => {
    const savedTxns = localStorage.getItem('vizito_revenue_transactions');
    const savedSets = localStorage.getItem('vizito_settlement_history');

    let loadedTxns = savedTxns ? JSON.parse(savedTxns) : INITIAL_TRANSACTIONS;
    let loadedSets = savedSets ? JSON.parse(savedSets) : INITIAL_SETTLEMENTS;

    // Apply eligibility logic relative to July 14, 2026 10:41 AM
    loadedTxns = loadedTxns.map((t: RevenueTransaction) => {
      const apptDate = new Date(t.apptDateTime.replace(' ', 'T'));
      if (t.status === 'Pending' && apptDate.getTime() <= VIRTUAL_TODAY.getTime()) {
        return { ...t, status: 'Available' as const };
      }
      return t;
    });

    setTransactions(loadedTxns);
    setSettlementHistory(loadedSets);
    localStorage.setItem('vizito_revenue_transactions', JSON.stringify(loadedTxns));
    localStorage.setItem('vizito_settlement_history', JSON.stringify(loadedSets));
  }, []);

  const syncTransactions = (updated: RevenueTransaction[]) => {
    setTransactions(updated);
    localStorage.setItem('vizito_revenue_transactions', JSON.stringify(updated));
  };

  const syncSettlementHistory = (updated: SettlementRequest[]) => {
    setSettlementHistory(updated);
    localStorage.setItem('vizito_settlement_history', JSON.stringify(updated));
  };

  // ─── Calculations ───────────────────────────────────────────────────────────
  
  // Available Balance: Sum of netAmount for all 'Available' transactions
  const availableBalance = useMemo(() => {
    return transactions
      .filter(t => t.status === 'Available')
      .reduce((sum, curr) => sum + curr.netAmount, 0);
  }, [transactions]);

  // Requested Amount: Sum of requestedAmount for all 'Requested' settlements
  const requestedAmount = useMemo(() => {
    return settlementHistory
      .filter(s => s.status === 'Requested')
      .reduce((sum, curr) => sum + curr.requestedAmount, 0);
  }, [settlementHistory]);

  // Settled Amount: Sum of requestedAmount for all 'Settled' settlements
  const settledAmount = useMemo(() => {
    return settlementHistory
      .filter(s => s.status === 'Settled')
      .reduce((sum, curr) => sum + curr.requestedAmount, 0);
  }, [settlementHistory]);

  const processingAmount = useMemo(() => {
    return settlementHistory
      .filter(s => s.status === 'Processing')
      .reduce((sum, curr) => sum + curr.requestedAmount, 0);
  }, [settlementHistory]);

  const rejectedAmount = useMemo(() => {
    return settlementHistory
      .filter(s => s.status === 'Rejected')
      .reduce((sum, curr) => sum + curr.requestedAmount, 0);
  }, [settlementHistory]);

  // Total Revenue, Fee, and Net for Overview Card
  const totalRevenueSum = useMemo(() => {
    return transactions.reduce((sum, curr) => sum + curr.grossAmount, 0);
  }, [transactions]);

  const platformFeeSum = useMemo(() => {
    return transactions.reduce((sum, curr) => sum + curr.platformFee, 0);
  }, [transactions]);

  const netEarningsSum = useMemo(() => {
    return transactions.reduce((sum, curr) => sum + curr.netAmount, 0);
  }, [transactions]);

  // ─── Filter Calculations ────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search
      const matchesSearch = 
        t.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.apptId.toLowerCase().includes(searchQuery.toLowerCase());

      // Clinic Filter
      if (clinicFilter !== 'All' && t.clinic !== clinicFilter) return false;

      // Consultation Type Filter
      if (consultationTypeFilter !== 'All' && t.consultationType !== consultationTypeFilter) return false;

      // Settlement Status Filter
      if (revenueStatusFilter !== 'All' && t.status !== revenueStatusFilter) return false;

      // Date Filter
      const apptDate = new Date(t.apptDateTime.split(' ')[0]);
      if (dateFilter === 'Today') {
        return t.apptDateTime.startsWith('2026-07-14');
      }
      if (dateFilter === 'Yesterday') {
        return t.apptDateTime.startsWith('2026-07-13');
      }
      if (dateFilter === 'This Week') {
        const day = apptDate.getDate();
        return day >= 12 && day <= 18; // Week of July 12 - July 18, 2026
      }
      if (dateFilter === 'This Month') {
        return t.apptDateTime.startsWith('2026-07');
      }
      if (dateFilter === 'Last Month') {
        return t.apptDateTime.startsWith('2026-06');
      }
      if (dateFilter === 'Custom') {
        const start = new Date(customStartDate).getTime();
        const end = new Date(customEndDate).getTime();
        const apptSec = apptDate.getTime();
        return apptSec >= start && apptSec <= end;
      }

      return matchesSearch;
    });
  }, [transactions, searchQuery, clinicFilter, consultationTypeFilter, revenueStatusFilter, dateFilter, customStartDate, customEndDate]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // ─── Actions handlers ───────────────────────────────────────────────────────
  const handleResetFilters = () => {
    setDateFilter('This Month');
    setClinicFilter('All');
    setConsultationTypeFilter('All');
    setRevenueStatusFilter('All');
    setSearchQuery('');
    showToast('Filters reset to default.', 'info');
  };

  const handlePayoutSubmit = () => {
    const requestVal = parseFloat(settlementRequestAmount);
    if (isNaN(requestVal) || requestVal <= 0) {
      showToast('Settlement amount must be greater than zero.', 'error');
      return;
    }
    if (requestVal > availableBalance) {
      showToast('Requested amount cannot exceed available balance.', 'error');
      return;
    }
    if (!kycApproved) {
      showToast('Payout rejected. KYC approval is required.', 'error');
      return;
    }
    if (!bankDetailsVerified) {
      showToast('Payout rejected. Verified bank details required.', 'error');
      return;
    }

    // Process payout request
    let remainingToDebit = requestVal;
    const updatedTxns = transactions.map(t => {
      if (t.status === 'Available' && remainingToDebit > 0) {
        if (t.netAmount <= remainingToDebit) {
          remainingToDebit -= t.netAmount;
          return { ...t, status: 'Requested' as const };
        } else {
          // partially cover (split not supported fully by model, transition whole transaction status)
          remainingToDebit = 0;
          return { ...t, status: 'Requested' as const };
        }
      }
      return t;
    });

    const newRequest: SettlementRequest = {
      id: `SET${Math.floor(1004 + Math.random() * 9000)}`,
      requestDate: '14 Jul 2026',
      requestedAmount: requestVal,
      processedDate: '—',
      status: 'Requested',
      referenceNumber: '—',
      bankAccount: bankAccount
    };

    syncTransactions(updatedTxns);
    syncSettlementHistory([newRequest, ...settlementHistory]);
    setIsPayoutModalOpen(false);
    setSettlementRequestAmount('');
    showToast(`Settlement request of ₹${requestVal.toLocaleString()} submitted successfully.`, 'success');
  };

  const triggerExport = (format: 'PDF' | 'Excel') => {
    setIsExportModalOpen(false);
    showToast(`Successfully compiled and exported ${filteredTransactions.length} records to ${format} format.`, 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-fade flex items-center gap-3 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl max-w-sm">
          <CheckCircle2 className={`w-5 h-5 shrink-0 ${toast.type === 'error' ? 'text-rose-500' : 'text-teal-400'}`} />
          <p className="text-xs font-bold">{toast.message}</p>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2B2B2B] tracking-tight">Revenue &amp; Settlement</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Track consultations earnings, check platform fees, and request settlement transfers</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export Records
          </button>
          
          {availableBalance > 0 && (
            <button
              onClick={() => setIsPayoutModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#5C2494] to-[#7C3AED] hover:opacity-95 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              Request Settlement
            </button>
          )}
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Revenue', val: totalRevenueSum, color: 'bg-purple-50 text-[#7C3AED]', clickAction: () => { setActiveViewTab('Transactions'); setRevenueStatusFilter('All'); } },
          { title: 'Available Balance', val: availableBalance, color: 'bg-emerald-50 text-emerald-700', clickAction: () => { setActiveViewTab('Transactions'); setRevenueStatusFilter('Available'); } },
          { title: 'Requested Amount', val: requestedAmount, color: 'bg-blue-50 text-blue-700', clickAction: () => { setActiveViewTab('Settlement History'); } },
          { title: 'Settled Amount', val: settledAmount, color: 'bg-indigo-50 text-indigo-700', clickAction: () => { setActiveViewTab('Settlement History'); } }
        ].map(card => (
          <div
            key={card.title}
            onClick={card.clickAction}
            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-[#5C2494]/30 hover:shadow-md transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{card.title}</span>
            <div className="flex items-baseline justify-between mt-2">
              <h4 className="text-xl font-black text-slate-800">₹{card.val.toLocaleString('en-IN')}</h4>
              <span className={`text-[10px] font-bold ${card.color} px-1.5 py-0.5 rounded`}>View Details</span>
            </div>
          </div>
        ))}
      </div>

      {/* View Tabs Selector */}
      <div className="flex items-center border-b border-slate-100">
        {(['Overview', 'Transactions', 'Settlement History'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveViewTab(tab)}
            className={`relative px-4 py-3 text-xs font-black transition-colors whitespace-nowrap cursor-pointer ${activeViewTab === tab ? 'text-purple-700' : 'text-slate-550 hover:text-slate-850'}`}
          >
            {tab}
            {activeViewTab === tab && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5C2494] rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* ── VIEW 1: FINANCIAL OVERVIEW ──────────────────────────────────────── */}
      {activeViewTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Revenue Breakdowns */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800">Revenue Breakdown Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Total gross Revenue</span>
                <p className="text-base font-black text-slate-800 mt-0.5">₹{totalRevenueSum.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Platform Fee</span>
                <p className="text-base font-black text-rose-600 mt-0.5">₹{platformFeeSum.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Net Earnings</span>
                <p className="text-base font-black text-emerald-700 mt-0.5">₹{netEarningsSum.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase">Available Settlement</span>
                <p className="text-base font-black text-slate-800 mt-0.5">₹{availableBalance.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Sparkline chart trend simulation */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Daily Earnings Trend</span>
              <div className="h-44 bg-slate-50 rounded-xl p-4 flex items-end justify-between gap-2.5">
                {[
                  { day: '08 Jul', earnings: 500 },
                  { day: '09 Jul', earnings: 850 },
                  { day: '10 Jul', earnings: 680 },
                  { day: '11 Jul', earnings: 1200 },
                  { day: '12 Jul', earnings: 850 },
                  { day: '13 Jul', earnings: 1275 },
                  { day: '14 Jul', earnings: 1530 }
                ].map(pt => (
                  <div key={pt.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <span className="text-[8px] font-black text-slate-500">₹{pt.earnings}</span>
                    <div className="w-full bg-[#5C2494]/30 rounded-t-md hover:bg-[#5C2494] transition-all" style={{ height: `${(pt.earnings / 1600) * 80}%` }} />
                    <span className="text-[9px] font-bold text-slate-400">{pt.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar KYC info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-2.5">
                <h3 className="text-sm font-bold text-slate-800">Settlement Verification Pipeline</h3>
              </div>
              <div className="space-y-3.5 text-xs font-semibold">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">KYC Verification Status</span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-0.5 text-[10px] font-black">Approved</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Linked Bank Account</span>
                  <span className="text-slate-700">{bankAccount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Bank Detail Status</span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-0.5 text-[10px] font-black">Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 2: TRANSACTIONS TAB ────────────────────────────────────────── */}
      {activeViewTab === 'Transactions' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden space-y-4 p-4">
          
          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-4.5 rounded-xl border border-slate-150">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Search Patient or ID</label>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Clinic Selection</label>
              <select
                value={clinicFilter}
                onChange={e => setClinicFilter(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="All">All Clinics</option>
                <option value="Apollo Hospital">Apollo Hospital</option>
                <option value="Care Clinic Banjara">Care Clinic Banjara</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Consultation Format</label>
              <select
                value={consultationTypeFilter}
                onChange={e => setConsultationTypeFilter(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="All">All Types</option>
                <option value="In-Clinic">In-Clinic</option>
                <option value="Video Consultation">Video Consultation</option>
                <option value="Home Visit">Home Visit</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Settlement Status</label>
              <select
                value={revenueStatusFilter}
                onChange={e => setRevenueStatusFilter(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Requested">Requested</option>
                <option value="Processing">Processing</option>
                <option value="Settled">Settled</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Date Period</label>
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value as any)}
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="This Month">This Month</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This Week</option>
                <option value="Last Month">Last Month</option>
                <option value="Custom">Custom Date Range</option>
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

            {(searchQuery || clinicFilter !== 'All' || consultationTypeFilter !== 'All' || revenueStatusFilter !== 'All') && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-black text-rose-600 hover:underline px-2.5 py-1.5 self-end"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto min-w-[900px]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3">Transaction ID</th>
                  <th className="p-3">Appointment ID</th>
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Consultation Type</th>
                  <th className="p-3">Appointment Time</th>
                  <th className="p-3 text-right">Gross</th>
                  <th className="p-3 text-right">Deductions</th>
                  <th className="p-3 text-right">Net Share</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">No revenue found.</td>
                  </tr>
                ) : (
                  paginatedTransactions.map(txn => (
                    <tr key={txn.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-800">{txn.id}</td>
                      <td className="p-3 font-mono text-slate-650">{txn.apptId}</td>
                      <td className="p-3 font-black text-slate-800">{txn.patientName}</td>
                      <td className="p-3 text-slate-500">{txn.consultationType}</td>
                      <td className="p-3 text-slate-600">{txn.apptDisplayDate}</td>
                      <td className="p-3 text-right text-slate-700">₹{txn.grossAmount}</td>
                      <td className="p-3 text-right text-rose-500">-₹{txn.platformFee}</td>
                      <td className="p-3 text-right text-slate-900 font-black">₹{txn.netAmount}</td>
                      <td className="p-3">
                        <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          txn.status === 'Settled' ? 'bg-emerald-50 text-emerald-600' :
                          txn.status === 'Requested' ? 'bg-blue-50 text-blue-600' :
                          txn.status === 'Rejected' ? 'bg-rose-50 text-rose-500' :
                          txn.status === 'Available' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="p-3 text-right flex justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setViewingTxn(txn)}
                          className="p-1 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Sizing and Page selector */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs bg-slate-50 px-4 py-2 rounded-xl">
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
        </div>
      )}

      {/* ── VIEW 3: SETTLEMENT HISTORY ───────────────────────────────────────── */}
      {activeViewTab === 'Settlement History' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Settlement History Log</h3>
          </div>

          <div className="overflow-x-auto min-w-[750px]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                  <th className="p-3">Settlement ID</th>
                  <th className="p-3">Request Date</th>
                  <th className="p-3 text-right">Requested Amount</th>
                  <th className="p-3">Processed Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Reference Number</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {settlementHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">No settlement requests found.</td>
                  </tr>
                ) : (
                  settlementHistory.map(setRecord => (
                    <tr key={setRecord.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-slate-800">{setRecord.id}</td>
                      <td className="p-3 text-slate-650">{setRecord.requestDate}</td>
                      <td className="p-3 text-right text-slate-900 font-black">₹{setRecord.requestedAmount.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-slate-550">{setRecord.processedDate}</td>
                      <td className="p-3">
                        <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          setRecord.status === 'Settled' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                          setRecord.status === 'Rejected' ? 'bg-rose-50 text-rose-500 border border-rose-200' :
                          'bg-amber-50 text-amber-600 border border-amber-250'
                        }`}>
                          {setRecord.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-500">{setRecord.referenceNumber}</td>
                      <td className="p-3 text-right flex justify-end gap-1.5">
                        <button
                          onClick={() => setViewingSettlement(setRecord)}
                          className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODALS & POPUPS ────────────────────────────────────────────────── */}

      {/* SETTLEMENT REQUEST FORM MODAL */}
      {isPayoutModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setIsPayoutModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Submit Settlement Request</h3>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-semibold text-slate-650">
              <div className="flex justify-between">
                <span>Available Settlement Balance:</span>
                <span className="font-black text-slate-900 text-sm">₹{availableBalance.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Linked Bank Account:</span>
                <span className="text-slate-800 font-bold">{bankAccount}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Settlement Request Amount (INR) *</label>
                <input
                  type="text"
                  placeholder="e.g. 5000"
                  value={settlementRequestAmount}
                  onChange={e => setSettlementRequestAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-650"
              >
                Cancel
              </button>
              <button
                onClick={handlePayoutSubmit}
                className="bg-gradient-to-r from-[#5C2494] to-[#7C3AED] text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT OPTIONS POPUP */}
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
              <h3 className="text-sm font-bold text-slate-800">Export Filtered Transactions</h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Choose layout format</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => triggerExport('PDF')}
                className="flex flex-col items-center justify-center gap-2 border border-slate-200 hover:border-purple-300 p-4 rounded-xl hover:bg-slate-50/50"
              >
                <FileText className="w-8 h-8 text-rose-500" />
                <span className="text-xs font-bold text-slate-700">PDF Report</span>
              </button>

              <button
                onClick={() => triggerExport('Excel')}
                className="flex flex-col items-center justify-center gap-2 border border-slate-200 hover:border-purple-300 p-4 rounded-xl hover:bg-slate-50/50"
              >
                <SlidersHorizontal className="w-8 h-8 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700">Excel / CSV Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION DETAILS MODAL */}
      {viewingTxn && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setViewingTxn(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Transaction Details</h3>
              <button onClick={() => setViewingTxn(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-semibold text-slate-650">
              <div>Transaction ID: <span className="font-mono font-bold text-slate-800">{viewingTxn.id}</span></div>
              <div>Appointment ID: <span className="font-mono text-slate-800">{viewingTxn.apptId}</span></div>
              <div>Patient Name: <span className="font-bold text-slate-850">{viewingTxn.patientName}</span></div>
              <div>Format Type: <span className="font-bold text-slate-850">{viewingTxn.consultationType}</span></div>
              <div>Appointment Date: <span className="font-bold text-slate-850">{viewingTxn.apptDisplayDate}</span></div>
              <div>Clinic Center: <span className="font-bold text-slate-800">{viewingTxn.clinic}</span></div>
              <div className="h-px bg-slate-100 my-2" />
              <div className="flex justify-between">
                <span>Gross Amount Paid:</span>
                <span className="font-bold text-slate-800">₹{viewingTxn.grossAmount}</span>
              </div>
              <div className="flex justify-between">
                <span>Viziito platform share (15%):</span>
                <span className="font-bold text-rose-500">-₹{viewingTxn.platformFee}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-black text-slate-900">
                <span>Doctor Net Earnings:</span>
                <span>₹{viewingTxn.netAmount}</span>
              </div>
              <div>Settlement Status: <span className="font-bold text-slate-800">{viewingTxn.status}</span></div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewingTxn(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-650"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTLEMENT DETAILS AUDIT TRAIL MODAL */}
      {viewingSettlement && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setViewingSettlement(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Settlement Audit Details</h3>
              <button onClick={() => setViewingSettlement(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-semibold text-slate-650">
              <div>Settlement ID: <span className="font-mono font-bold text-slate-850">{viewingSettlement.id}</span></div>
              <div>Target Bank Account: <span className="font-bold text-slate-800">{viewingSettlement.bankAccount}</span></div>
              <div>Request Date: <span className="font-bold text-slate-800">{viewingSettlement.requestDate}</span></div>
              <div>Processed Release Date: <span className="font-bold text-slate-800">{viewingSettlement.processedDate}</span></div>
              <div>Total Requested Net Amount: <span className="font-black text-slate-900 text-sm">₹{viewingSettlement.requestedAmount.toLocaleString('en-IN')}</span></div>
              <div>Reference Transaction: <span className="font-mono text-slate-800">{viewingSettlement.referenceNumber}</span></div>
              <div>Payout Pipeline Status: <span className="font-bold text-slate-800">{viewingSettlement.status}</span></div>
              {viewingSettlement.remarks && (
                <div className="bg-rose-50 border border-rose-150 p-2.5 rounded-lg text-rose-600">
                  Remarks / Reject Reason: <span className="font-bold">{viewingSettlement.remarks}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewingSettlement(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-650"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
