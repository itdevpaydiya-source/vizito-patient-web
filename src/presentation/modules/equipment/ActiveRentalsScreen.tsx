import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  ChevronRight,
  Calendar,
  Clock,
  RotateCcw,
  MapPin,
  ClipboardList,
  Plus,
  CheckCircle2,
  Box,
} from 'lucide-react';
import type { PatientRentalOrder } from './types';
import { equipmentService } from './equipmentService';

export const ActiveRentalsScreen: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<PatientRentalOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    equipmentService
      .getActiveRentals()
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load active rentals:', err);
        setLoading(false);
      });
  }, []);

  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getRemainingDays = (endDateStr: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(endDateStr);
      end.setHours(0, 0, 0, 0);
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? `${diffDays} days remaining` : 'Expires today';
    } catch {
      return '6 days remaining';
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
        <span className="text-[#C26532] font-bold">Active Equipment Leases</span>
      </nav>

      {/* 2. Page Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#FFF5EB] border border-[#FDE3CF] flex items-center justify-center text-[#C26532] shadow-2xs shrink-0">
            <Package className="w-6 h-6 text-[#C26532]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Active Equipment Leases
            </h1>
          </div>
        </div>

        {/* Action Buttons on Right */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scheduled Returns */}
          <button
            type="button"
            onClick={() => navigate('/equipment-rental/returns')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FFF9F2] border border-[#FDE3CF] text-[#C26532] hover:bg-[#FFF3E8] rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Scheduled Returns</span>
          </button>

          {/* All Rental Orders */}
          <button
            type="button"
            onClick={() => navigate('/equipment-rental/orders')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <ClipboardList className="w-4 h-4 text-slate-500" />
            <span>All Rental Orders</span>
          </button>

          {/* Rent Additional Unit */}
          <button
            type="button"
            onClick={() => navigate('/equipment-rental')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9C4119] hover:bg-[#853512] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Rent Additional Unit</span>
          </button>
        </div>
      </div>

      {/* 3. Active Leases List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-[#9C4119] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading your active leases...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs space-y-3">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No active leases</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You currently have no equipment actively deployed at home.
          </p>
          <button
            type="button"
            onClick={() => navigate('/equipment-rental')}
            className="px-4 py-2 bg-[#9C4119] text-white rounded-xl text-xs font-bold hover:bg-[#853512] transition-colors cursor-pointer"
          >
            Browse Catalogue
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow space-y-5"
              >
                {/* Upper Details Row */}
                <div className="flex items-start gap-5">
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

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {order.orderNumber}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E6F4EA] text-[#137333]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active Lease</span>
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                      {order.equipmentName}
                    </h2>

                    <div className="pt-0.5">
                      <span className="text-sm font-bold text-[#1A73E8]">
                        ₹{order.dailyRate} / day
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metric Strip (Start, Return, Remaining, Asset ID, Handover Status) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                  {/* Start Date */}
                  <div className="flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-[#C26532] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-500 block">Start Date</span>
                      <span className="text-xs font-bold text-slate-900">
                        {formatDateDisplay(order.startDate)}
                      </span>
                    </div>
                  </div>

                  {/* Return Date */}
                  <div className="flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-[#C26532] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-500 block">Return Date</span>
                      <span className="text-xs font-bold text-slate-900">
                        {formatDateDisplay(order.endDate)}
                      </span>
                    </div>
                  </div>

                  {/* Remaining Days */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-[#E6F4EA] text-[#137333]">
                      {getRemainingDays(order.endDate)}
                    </span>
                  </div>

                  {/* Rented Quantity */}
                  <div className="flex items-start gap-2.5">
                    <Box className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-500 block">Rented Quantity</span>
                      <span className="text-xs font-bold text-slate-900">{order.quantity || 1} Unit</span>
                    </div>
                  </div>

                  {/* Handover Status */}
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-500 block">Handover Status</span>
                      <span className="text-xs font-bold text-slate-900">Handover Complete</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Address and Action Buttons */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                    {(() => {
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
                          <RotateCcw className="w-3.5 h-3.5" />
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
                      <span>View Rental Details</span>
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

export default ActiveRentalsScreen;
