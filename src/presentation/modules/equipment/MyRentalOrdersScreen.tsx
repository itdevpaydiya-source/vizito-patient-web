import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  ChevronRight,
  Calendar,
  Clock,
  RotateCcw,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Truck,
  Box,
} from 'lucide-react';
import type { PatientRentalOrder, RentalOrderStatus } from './types';
import { equipmentService } from './equipmentService';

export const MyRentalOrdersScreen: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<PatientRentalOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    equipmentService
      .getMyOrders({
        search,
        status: activeTab,
      })
      .then((res) => {
        setOrders(res.orders);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load patient equipment orders:', err);
        setLoading(false);
      });
  }, [activeTab, search]);

  // Format date helper: "Oct 03, 2026"
  const formatPlacedDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Format date range: "Oct 04 – Oct 18, 2026"
  const formatRentalPeriod = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const startFormatted = s.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      const endFormatted = e.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      return `${startFormatted} – ${endFormatted}`;
    } catch {
      return `${startStr} – ${endStr}`;
    }
  };

  // Categories of tabs
  const tabList = [
    { id: 'all', label: 'All', count: orders.length },
    {
      id: 'confirmed',
      label: 'Confirmed',
      count: orders.filter((o) => o.status === 'confirmed').length,
    },
    {
      id: 'out_for_delivery',
      label: 'Out for Delivery',
      count: orders.filter((o) => o.status === 'out_for_delivery').length,
    },
    {
      id: 'active',
      label: 'Active',
      count: orders.filter((o) => o.status === 'active').length,
    },
    {
      id: 'return_scheduled',
      label: 'Return Scheduled',
      count: orders.filter((o) => o.status === 'return_scheduled').length,
    },
    {
      id: 'completed',
      label: 'Completed',
      count: orders.filter((o) => o.status === 'completed').length,
    },
    {
      id: 'cancelled',
      label: 'Cancelled',
      count: orders.filter((o) => o.status === 'cancelled').length,
    },
  ];

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesTab =
        activeTab === 'all' ||
        order.status === activeTab;

      const matchesSearch =
        !search.trim() ||
        order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        order.equipmentName.toLowerCase().includes(search.toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, search]);

  const getStatusBadge = (status: RentalOrderStatus) => {
    switch (status) {
      case 'active':
        return {
          label: 'Active Rental',
          badge: 'bg-[#E6F4EA] text-[#137333]',
        };
      case 'confirmed':
        return {
          label: 'Confirmed',
          badge: 'bg-[#EEF2F6] text-[#2C4964]',
        };
      case 'awaiting_confirmation':
        return {
          label: 'Awaiting Confirmation',
          badge: 'bg-[#FEF7E0] text-[#B06000]',
        };
      case 'payment_pending':
        return {
          label: 'Payment Pending',
          badge: 'bg-[#FFF0E6] text-[#C26532]',
        };
      case 'out_for_delivery':
        return {
          label: 'Out for Delivery',
          badge: 'bg-[#E0F2FE] text-[#0369A1]',
        };
      case 'return_scheduled':
        return {
          label: 'Return Scheduled',
          badge: 'bg-[#F3E8FF] text-[#7E22CE]',
        };
      case 'return_requested':
        return {
          label: 'Return Requested',
          badge: 'bg-[#FEF7E0] text-[#B06000]',
        };
      case 'completed':
        return {
          label: 'Completed',
          badge: 'bg-slate-100 text-slate-700',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          badge: 'bg-rose-50 text-rose-700',
        };
      case 'rejected':
        return {
          label: 'Declined',
          badge: 'bg-rose-50 text-rose-700',
        };
      default:
        return {
          label: status,
          badge: 'bg-slate-100 text-slate-700',
        };
    }
  };


  return (
    <div className="space-y-4 pb-16 font-sans animate-in fade-in duration-200">
      {/* 1. Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-xs text-slate-500 font-medium" aria-label="Breadcrumb">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="hover:text-[#9C4119] transition-colors cursor-pointer"
        >
          Dashboard
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <button
          type="button"
          onClick={() => navigate('/equipment-rental')}
          className="hover:text-[#9C4119] transition-colors cursor-pointer"
        >
          Medical Equipment Rental
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-[#C26532] font-bold">My Equipment Rentals</span>
      </nav>

      {/* 2. Page Header & Quick Navigation Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#FFF5EB] border border-[#FDE3CF] flex items-center justify-center text-[#C26532] shadow-2xs shrink-0">
            <Package className="w-6 h-6 text-[#C26532]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              My Equipment Rentals
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your equipment bookings and active rentals.
            </p>
          </div>
        </div>

        {/* Action Buttons on Right */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active Rentals Filter Pill */}
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer border ${
              activeTab === 'active'
                ? 'bg-[#137333] text-white border-[#137333]'
                : 'bg-[#E6F4EA] border-[#A8DAB5] text-[#137333] hover:bg-[#D4EDDA]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Active Rentals</span>
          </button>

          {/* Scheduled Returns Filter Pill */}
          <button
            type="button"
            onClick={() => setActiveTab('return_scheduled')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer border ${
              activeTab === 'return_scheduled'
                ? 'bg-[#C26532] text-white border-[#C26532]'
                : 'bg-[#FFF9F2] border-[#FDE3CF] text-[#C26532] hover:bg-[#FFF3E8]'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Scheduled Returns</span>
          </button>

          {/* Rent New Equipment */}
          <button
            type="button"
            onClick={() => navigate('/equipment-rental')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9C4119] hover:bg-[#853512] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Rent New Equipment</span>
          </button>
        </div>
      </div>

      {/* 3. Status Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar flex-wrap">
        {tabList.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#9C4119] text-white shadow-2xs font-bold'
                  : 'bg-[#F1F3F4] text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-1 opacity-90">({tab.count})</span>
            </button>
          );
        })}
      </div>

      {/* 4. Order Cards List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-[#9C4119] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading your rental orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs space-y-3">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No rental bookings found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No equipment bookings match the selected status filter.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className="px-4 py-2 bg-[#9C4119] text-white rounded-xl text-xs font-bold hover:bg-[#853512] transition-colors cursor-pointer"
          >
            Show All Rentals
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusStyle = getStatusBadge(order.status);

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow space-y-4"
              >
                {/* Main Upper Section */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  {/* Left: Product Image & Detailed Specs */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                      <img
                        src={order.equipmentImage || '/equipment/hospital-bed.jpg'}
                        alt={order.equipmentName}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/equipment/hospital-bed.jpg';
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      {/* Order Number & Status Badge */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusStyle.badge}`}
                        >
                          {statusStyle.label}
                        </span>
                      </div>

                      {/* Equipment Name */}
                      <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-snug">
                        {order.equipmentName}
                      </h3>

                      {/* Rental Period */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Rental Period{' '}
                          <strong className="text-slate-800 font-semibold">
                            {formatRentalPeriod(order.startDate, order.endDate)}
                          </strong>{' '}
                          • {order.durationDays} Days
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Placed Date, Paid status, Price breakdown */}
                  <div className="w-full lg:w-72 shrink-0 space-y-2">
                    <div className="flex items-center justify-end gap-3 text-xs">
                      {order.paymentStatus === 'successful' && (
                        <span className="text-emerald-700 font-bold">Paid</span>
                      )}
                      <span className="text-slate-500 font-medium">
                        Placed on {formatPlacedDate(order.createdAt)}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs pt-1">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Rental Fee</span>
                        <span className="font-bold text-slate-900">
                          ₹{order.rentalFee.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Delivery Fee</span>
                        <span className="font-bold text-slate-900">
                          ₹{order.deliveryFee.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="bg-[#FFF3EB] rounded-xl px-3 py-2 flex items-baseline justify-between mt-2">
                        <span className="font-bold text-slate-900 text-sm">Total</span>
                        <span className="font-black text-xl text-[#9C4119]">
                          ₹{order.totalOrderValue.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Address and Action Buttons */}
                <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      <strong className="text-slate-800 font-semibold">Delivery Address:</strong>{' '}
                      {order.deliveryAddress?.addressLine
                        ? `${order.deliveryAddress.addressLine}${order.deliveryAddress.city ? `, ${order.deliveryAddress.city}` : ''}`
                        : 'Address on file'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {order.status === 'active' && (() => {
                      const end = order.endDate ? new Date(order.endDate).getTime() : 0;
                      const today = new Date().setHours(0, 0, 0, 0);
                      const diffDays = end ? Math.ceil((end - today) / (1000 * 60 * 60 * 24)) : 0;
                      const isOpen = diffDays <= 1;

                      return isOpen ? (
                        <button
                          type="button"
                          onClick={() => navigate('/equipment-rental/returns')}
                          className="px-4 py-2 bg-white border border-[#FDE3CF] hover:bg-orange-50/50 text-[#C26532] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Schedule Return</span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-1.5 text-[11px] text-slate-400 bg-slate-50 border border-slate-200 rounded-lg font-medium">
                          Return opens 1 day prior
                        </span>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={() => navigate(`/equipment-rental/orders/${order.id}`)}
                      className="px-4 py-2 bg-[#9C4119] hover:bg-[#853512] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>View Order Details</span>
                      <span>&gt;</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyRentalOrdersScreen;
