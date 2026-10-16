import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Search,
  ChevronRight,
  Info,
  X,
  MapPin,
  ClipboardList,
  Star,
  ShieldCheck,
} from 'lucide-react';
import type { PatientEquipmentItem } from './types';
import { equipmentService } from './equipmentService';

export const EquipmentCatalogueScreen: React.FC = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState<PatientEquipmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [priceSort, setPriceSort] = useState<'none' | 'low_to_high' | 'high_to_low'>('none');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    equipmentService
      .getCatalogue({
        search,
        priceSort,
        onlyAvailable,
      })
      .then((res) => {
        if (isMounted) {
          // Display only Super Admin-approved products
          const approvedItems = (res.items || []).filter(
            (it) => it.approvalStatus === undefined || it.approvalStatus === 'approved'
          );
          setItems(approvedItems);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load equipment catalogue:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [search, priceSort, onlyAvailable]);

  return (
    <div className="space-y-4 pb-12 font-sans animate-in fade-in duration-200">
      {/* 1. Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-xs text-slate-500 font-medium" aria-label="Breadcrumb">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="hover:text-[#9C4119] transition-colors cursor-pointer"
        >
          Dashboard
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <button
          type="button"
          onClick={() => navigate('/healthcare-services')}
          className="hover:text-[#9C4119] transition-colors cursor-pointer"
        >
          Healthcare Services
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[#9C4119] font-bold">Medical Equipment Rental</span>
      </nav>

      {/* 2. Page Header & Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#E0F7F6] border border-[#B2EBF2] flex items-center justify-center text-[#00897B] shadow-2xs shrink-0">
            <Box className="w-6 h-6 text-[#00897B]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Medical Equipment Rental
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Clinical-grade home healthcare devices · Sanitized, calibrated & demonstrated by technicians
            </p>
          </div>
        </div>

        {/* Quick Navigation Access */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/equipment-rental/orders')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
            <span>My Orders</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/equipment-rental/active')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#E6F4EA] border border-[#CEEAD6] rounded-xl text-xs font-semibold text-[#137333] hover:bg-[#D4EDDA] transition-colors shadow-2xs cursor-pointer"
          >
            <span>Active Rentals</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/equipment-rental/returns')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FEF7E0] border border-[#FEEFC3] rounded-xl text-xs font-semibold text-[#B06000] hover:bg-[#FDEBB8] transition-colors shadow-2xs cursor-pointer"
          >
            <span>Scheduled Returns</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search equipment by name, brand, or condition (e.g., Oxygen, Bed, Wheelchair)..."
            className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#9C4119] focus:border-[#9C4119] shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative shrink-0">
          <select
            value={priceSort}
            onChange={(e) => setPriceSort(e.target.value as any)}
            className="h-9.5 px-3 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9C4119] shadow-2xs min-w-[130px] cursor-pointer"
          >
            <option value="none">Sort: Featured</option>
            <option value="low_to_high">Price: Low to High</option>
            <option value="high_to_low">Price: High to Low</option>
          </select>
        </div>

        {/* In Stock Only Checkbox */}
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none shrink-0 px-2 py-1">
          <input
            type="checkbox"
            checked={onlyAvailable}
            onChange={(e) => setOnlyAvailable(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-[#9C4119] focus:ring-[#9C4119] cursor-pointer"
          />
          <span>In Stock Only</span>
        </label>
      </div>

      {/* 5. Equipment Cards Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-[#9C4119] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading approved medical equipment...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs space-y-3">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
            <Box className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No equipment found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No matching equipment was found for the current search or filters. Try clearing your search keyword.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setOnlyAvailable(false);
            }}
            className="px-4 py-2 bg-[#9C4119] text-white rounded-xl text-xs font-bold hover:bg-[#853512] transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4.5">
          {items.map((item) => {
            const isOutOfStock = (item.availableStock !== undefined && item.availableStock <= 0) || item.isAvailable === false;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all duration-200 flex flex-col"
              >
                {/* Image */}
                <div className="relative h-36 sm:h-40 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center p-2.5">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-contain"
                  />
                  {/* Stock Availability Badge - only shown if Out of Stock */}
                  {isOutOfStock && (
                    <div className="absolute top-2.5 left-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                  {/* Title & Short Description */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 min-h-[2.3rem]">
                      {item.name}
                    </h3>

                    {/* Real Patient Rating */}
                    {item.rating && item.rating > 0 ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= Math.round(item.rating || 0)
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-200 fill-slate-100'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          {Number(item.rating).toFixed(item.rating % 1 === 0 ? 0 : 1)}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({item.reviewCount || 1} {item.reviewCount === 1 ? 'review' : 'reviews'})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="w-3 h-3 text-slate-200 fill-slate-100" />
                          ))}
                        </div>
                        <span className="text-[10.5px] text-slate-400">No reviews yet</span>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {item.shortDescription}
                      <button
                        type="button"
                        onClick={() => navigate(`/equipment-rental/item/${item.id}`)}
                        className="text-[#1A73E8] hover:underline font-semibold ml-1 cursor-pointer"
                      >
                        More
                      </button>
                    </p>
                  </div>

                  {/* Pricing, Distance & Action */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                    <div className="space-y-1">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wide">
                          Rental Price
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-base sm:text-lg font-bold text-slate-900">
                            ₹{item.dailyRate}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">/ day</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10.5px] text-slate-600 mt-2">
                      <MapPin className="w-3.5 h-3.5 text-[#9C4119] shrink-0" />
                      <div className="flex flex-wrap items-center gap-1 truncate" title={item.providerAddress || item.providerLocation || undefined}>
                        <span className="font-semibold text-slate-800">{item.providerName || 'Verified Rental Provider'}</span>
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-md">
                          <ShieldCheck className="w-3 h-3 text-sky-600" />
                          Verified
                        </span>
                        {item.providerAddress ? (
                          <span className="text-slate-500 font-normal"> • {item.providerAddress}</span>
                        ) : item.providerLocation ? (
                          <span className="text-slate-500 font-normal"> • {item.providerLocation}</span>
                        ) : null}
                      </div>
                    </div>

                    {isOutOfStock ? (
                      <button
                        type="button"
                        disabled
                        className="w-full mt-2.5 py-2 px-3 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-not-allowed"
                      >
                        <span>Out of Stock — Booking Unavailable</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/equipment-rental/item/${item.id}`)}
                        className="w-full mt-2.5 py-2 px-3 rounded-xl bg-[#9C4119] hover:bg-[#853512] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      >
                        <span>View Details</span>
                        <span>→</span>
                      </button>
                    )}
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

export default EquipmentCatalogueScreen;
