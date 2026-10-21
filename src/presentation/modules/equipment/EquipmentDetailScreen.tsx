import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ChevronDown,
  Tag,
  Shield,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Truck,
  Info,
  X,
  Star,
  Zap,
  Smartphone,
  Building2,
  Scale,
  Phone,
  Clock,
  Sparkles,
  AlertCircle,
  FileText,
  ExternalLink,
  Globe,
  Mail,
} from 'lucide-react';
import type { PatientEquipmentItem, RentalProviderProfile } from './types';
import { equipmentService } from './equipmentService';
import { getPatientProfileApi } from '../../../services/patientHelper';
import { calculateAddressDistanceKm, calculateEquipmentDeliveryFee } from './distanceUtils';
import { PartnerProfileModal } from './PartnerProfileModal';

interface RentalProvider {
  id: string;
  productId?: string;
  name: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  location: string;
  distanceText: string;
  distanceKm: number | null;
  rentalPrice: number;
  deposit: number;
  inStock: boolean;
  availableStock?: number;
  deliveryType: string;
  deliveryEst: string;
  image: string;
  logo?: string;
  banner?: string;
  phone: string;
  email?: string;
  address: string;
  hours: string;
  providerDetails?: RentalProviderProfile;
  productItem?: PatientEquipmentItem;
}

export const EquipmentDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

    const [item, setItem] = useState<PatientEquipmentItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [showMoreModal, setShowMoreModal] = useState<boolean>(false);
  const [selectedProviderModal, setSelectedProviderModal] = useState<RentalProvider | null>(null);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'distance' | 'rating'>('price_asc');
  const [distanceRadius, setDistanceRadius] = useState<number>(10);
  const [patientAddress, setPatientAddress] = useState<any>(null);

  useEffect(() => {
    getPatientProfileApi()
      .then((profile) => {
        if (!profile) return;
        if (Array.isArray(profile.addresses) && profile.addresses.length > 0) {
          const def =
            profile.addresses.find((a: any) => a.isDefault || a.is_default) ||
            profile.addresses[0];
          setPatientAddress(def);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    equipmentService
      .getEquipmentById(id)
      .then(async (data) => {
        if (!data) {
          setItem(null);
          setLoading(false);
          return;
        }

        // Fetch catalogue to ensure all available products with the same name across all providers are discovered
        let allMatchingProducts: PatientEquipmentItem[] = data.availableRentals && data.availableRentals.length > 0
          ? [...data.availableRentals]
          : [];

        try {
          const catRes = await equipmentService.getCatalogue();
          const cleanName = data.name.trim().toLowerCase();
          const matching = catRes.items.filter(
            (p) => p.name.trim().toLowerCase() === cleanName
          );
          matching.forEach((mp) => {
            if (!allMatchingProducts.some((p) => p.id === mp.id)) {
              allMatchingProducts.push(mp);
            }
          });
        } catch (e) {
          console.warn('Catalogue match error:', e);
        }

        // Make sure data (with full specifications and description) is stored in allMatchingProducts
        const existingDataIdx = allMatchingProducts.findIndex((p) => p.id === data.id);
        if (existingDataIdx >= 0) {
          allMatchingProducts[existingDataIdx] = {
            ...allMatchingProducts[existingDataIdx],
            ...data,
          };
        } else {
          allMatchingProducts.push(data);
        }

        // Sort by dailyRate ascending: lowest price product first
        allMatchingProducts.sort((a, b) => a.dailyRate - b.dailyRate);

        // Display the lowest price product as the featured product at the top
        const lowestPriceItem = allMatchingProducts[0];

        // Ensure specifications, accessories, and descriptions are never lost
        const mergedSpecs = (lowestPriceItem.specifications && lowestPriceItem.specifications.length > 0)
          ? lowestPriceItem.specifications
          : (data.specifications && data.specifications.length > 0 ? data.specifications : []);

        const mergedAccessories = (lowestPriceItem.includedAccessories && lowestPriceItem.includedAccessories.length > 0)
          ? lowestPriceItem.includedAccessories
          : (data.includedAccessories && data.includedAccessories.length > 0 ? data.includedAccessories : []);

        setItem({
          ...data,
          ...lowestPriceItem,
          specifications: mergedSpecs,
          includedAccessories: mergedAccessories,
          fullDescription: lowestPriceItem.fullDescription || data.fullDescription,
          lowestRentalPrice: lowestPriceItem.dailyRate,
          availableRentals: allMatchingProducts,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to get equipment details:', err);
        setLoading(false);
      });
  }, [id]);

  // Gallery images list
  const galleryImages = useMemo(() => {
    if (!item) return [];
    const images = [item.imageUrl];
    if (item.additionalImages && item.additionalImages.length > 0) {
      item.additionalImages.forEach((img) => {
        if (!images.includes(img)) images.push(img);
      });
    }
    // Fallbacks if fewer than 3
    if (images.length === 1 && item.id === 'EQ-BED-ICU') {
      images.push('/equipment/bed-thumb-2.jpg', '/equipment/bed-thumb-3.jpg');
    }
    return images;
  }, [item]);

  // Real calculated distance between patient's address and partner's address
  const calculatedDistance = useMemo(() => {
    if (!item) return null;
    return calculateAddressDistanceKm(
      patientAddress
        ? {
            latitude: patientAddress.latitude,
            longitude: patientAddress.longitude,
            pincode: patientAddress.pincode,
            text: [
              patientAddress.addressLine1 || patientAddress.address_line_1,
              patientAddress.addressLine2 || patientAddress.address_line_2,
              patientAddress.city || patientAddress.cityName,
            ]
              .filter(Boolean)
              .join(', '),
          }
        : null,
      {
        latitude: item.providerLatitude,
        longitude: item.providerLongitude,
        pincode: item.providerZipcode,
        text: item.providerAddress || item.providerLocation,
      }
    );
  }, [item, patientAddress]);

  // Providers offering this item derived from availableRentals or item
  const providers: RentalProvider[] = useMemo(() => {
    if (!item) return [];

    const list = item.availableRentals && item.availableRentals.length > 0
      ? item.availableRentals
      : [item];

    return list.map((p: PatientEquipmentItem) => {
      const providerName =
        p.providerName ||
        (p.manufacturer ? `${p.manufacturer} Certified Rental Hub` : 'Verified Healthcare Rental Provider');
      const providerAddress = p.providerAddress || 'Showroom address on file';
      const providerLocation = p.providerLocation || p.providerAddress || 'Provider Hub';
      const providerPhone = p.providerPhone || 'Support Contact on File';

      const pDist = calculateAddressDistanceKm(
        patientAddress
          ? {
              latitude: patientAddress.latitude,
              longitude: patientAddress.longitude,
              pincode: patientAddress.pincode,
              text: [
                patientAddress.addressLine1 || patientAddress.address_line_1,
                patientAddress.addressLine2 || patientAddress.address_line_2,
                patientAddress.city || patientAddress.cityName,
              ]
                .filter(Boolean)
                .join(', '),
            }
          : null,
        {
          latitude: p.providerLatitude,
          longitude: p.providerLongitude,
          pincode: p.providerZipcode,
          text: p.providerAddress || p.providerLocation,
        }
      );

      const dist = pDist != null ? pDist : calculatedDistance;
      const distText = dist != null ? `${dist} km away` : (p.providerLocation || p.providerAddress || 'Address on file');

      return {
        id: p.providerId || `prov-${p.id}`,
        productId: p.id,
        name: providerName,
        verified: true,
        rating: p.rating ?? 0,
        reviewCount: p.reviewCount ?? 0,
        location: providerLocation,
        distanceText: distText,
        distanceKm: dist,
        rentalPrice: p.dailyRate,
        deposit: p.securityDeposit,
        inStock: p.isAvailable,
        availableStock: p.availableStock,
        deliveryType: 'Doorstep Delivery & Installation',
        deliveryEst: 'Within 24 hours',
        image: p.imageUrl || item.imageUrl || '/equipment/hospital-bed.jpg',
        logo: p.providerLogo || p.providerDetails?.logo,
        banner: p.providerBanner || p.providerDetails?.banner,
        phone: providerPhone,
        email: p.providerEmail,
        address: providerAddress,
        hours: 'Mon - Sun: 8:00 AM - 9:00 PM',
        providerDetails: p.providerDetails,
        productItem: p,
      };
    });
  }, [item, calculatedDistance, patientAddress]);

  // Sorted and filtered providers
  const filteredProviders = useMemo(() => {
    let list = [...providers].filter((p) => p.distanceKm == null || p.distanceKm <= distanceRadius);
    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.rentalPrice - b.rentalPrice);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.rentalPrice - a.rentalPrice);
    } else if (sortBy === 'distance') {
      list.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    }
    return list;
  }, [providers, sortBy, distanceRadius]);

  const handleOpenProviderModal = (provider: RentalProvider) => {
    setSelectedProviderModal(provider);
  };

  const handleSelectRental = (provider: RentalProvider) => {
    if (!item) return;
    if (!provider.inStock || (provider.availableStock !== undefined && provider.availableStock <= 0)) {
      return;
    }
    const targetItem = provider.productItem || item;
    const durationDays = targetItem.minDurationDays || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    const startDateStr = startDate.toISOString().split('T')[0];

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);
    const endDateStr = endDate.toISOString().split('T')[0];

    const deliveryFee = calculateEquipmentDeliveryFee(provider.distanceKm, targetItem.deliverySlabs);
    const rentalFee = provider.rentalPrice * durationDays;
    const totalOrderValue = rentalFee + deliveryFee;

    const quote = {
      equipmentId: targetItem.id,
      startDate: startDateStr,
      endDate: endDateStr,
      durationDays,
      dailyRate: provider.rentalPrice,
      securityDeposit: provider.deposit,
      rentalFee,
      deliveryFee,
      totalOrderValue,
      depositNotice:
        'Security deposit is handled directly by the rental partner. It is separate from the rental price and delivery charges and is not included in the total order value or payment.',
    };

    navigate('/equipment-rental/checkout', {
      state: {
        item: {
          ...targetItem,
          dailyRate: provider.rentalPrice,
          securityDeposit: provider.deposit,
        },
        quote,
        provider,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#9C4119] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">Loading equipment specifications...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Equipment Record Not Found</h2>
          <p className="text-xs text-slate-500">
            The requested medical device could not be located in the approved catalogue.
          </p>
          <button
            type="button"
            onClick={() => navigate('/equipment-rental')}
            className="w-full py-2.5 bg-[#9C4119] hover:bg-[#853512] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Back to Equipment Catalogue
          </button>
        </div>
      </div>
    );
  }

  const activeMainImage = galleryImages[selectedImageIndex] || item.imageUrl;

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
          Equipment Rentals
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-900 font-bold truncate max-w-sm">{item.name}</span>
      </nav>

      {/* 2. Top Product Hero Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Column A: Gallery (Main photo + thumbnails) */}
          <div className="lg:col-span-4 space-y-3">
            {/* Main Showcase Image */}
            <div className="h-56 sm:h-64 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
              <img
                src={activeMainImage}
                alt={item.name}
                className="w-full h-full object-cover transition-all duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/equipment/hospital-bed.jpg';
                }}
              />
            </div>

            {/* Thumbnail Row */}
            <div className="grid grid-cols-4 gap-2">
              {galleryImages.slice(0, 3).map((thumb, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedImageIndex === idx ? 'border-[#C26532] shadow-xs' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={thumb}
                    alt={`${item.name} thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/equipment/hospital-bed.jpg';
                    }}
                  />
                </button>
              ))}

              {/* Fourth slot: +3 Box */}
              <button
                type="button"
                onClick={() => setShowMoreModal(true)}
                className="h-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                +3
              </button>
            </div>
          </div>

          {/* Column B: Product Details & 3 KPI Cards */}
          <div className="lg:col-span-5 space-y-4">
            {/* Title & Stock Status */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                {(item.availableStock !== undefined && item.availableStock <= 0) || item.isAvailable === false ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    Out of Stock Fleet-Wide
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E6F4EA] text-[#137333]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#137333]" />
                    {item.availableStock !== undefined ? `${item.availableStock} Available in Stock` : 'In Stock'}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                {item.name}
              </h1>

              {/* Real Patient Rating */}
              {item.rating && item.rating > 0 ? (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= Math.round(item.rating || 0)
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                    <span className="text-sm font-black text-slate-800 ml-1">{item.rating}</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    • {item.reviewCount || 1} verified patient {item.reviewCount === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-1.5 text-slate-400">
                  <div className="flex items-center gap-0.5 text-slate-300">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 text-slate-200" />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">No reviews yet</span>
                </div>
              )}
            </div>

            {/* Description with "... More" */}
            <p className="text-xs text-slate-500 leading-relaxed font-normal">
              {item.shortDescription ||
                'Adjustable backrest, legrest and height with smooth electric operation for home care. Suitable for ICU and long-term care patients....'}
              <button
                type="button"
                onClick={() => setShowMoreModal(true)}
                className="text-[#1A73E8] hover:underline font-bold ml-1 inline-flex items-center cursor-pointer"
              >
                More
              </button>
            </p>

            {/* 3 Metric Cards */}
            {(() => {
              const lowestPrice = filteredProviders.length > 0
                ? Math.min(...filteredProviders.map((p) => p.rentalPrice))
                : (item.lowestRentalPrice || item.dailyRate);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Metric 1: Lowest Rental Price */}
                  <div className="bg-[#FFFDF9] border border-[#FDE3CF] rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Tag className="w-3.5 h-3.5 text-[#C26532] shrink-0" />
                      <span className="text-[11px] font-medium text-slate-500">Lowest Rental Price</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl font-black text-slate-900">₹{lowestPrice}</span>
                      <span className="text-xs font-bold text-slate-700">/ day</span>
                    </div>
                  </div>

                  {/* Metric 2: Refundable Security Deposit */}
                  <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-[11px] font-medium text-slate-600">Security Deposit</span>
                      </div>
                      <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100/90 border border-emerald-200 px-1.5 py-0.2 rounded">
                        Refundable
                      </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl font-black text-slate-900">
                        ₹{(item.securityDeposit ?? (filteredProviders?.[0]?.deposit || 5000)).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700">100% back</span>
                    </div>
                  </div>

                  {/* Metric 3: Distance */}
                  <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-[#1A73E8] shrink-0" />
                      <span className="text-[11px] font-medium text-slate-500">Distance from address</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xl font-black text-slate-900">
                        {calculatedDistance != null ? `${calculatedDistance} km` : '--'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Informational Message about Security Deposit */}
            <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200/90 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-amber-950">Security Deposit:</span>
                  <span className="font-black text-amber-900">
                    ₹{(item.securityDeposit ?? (filteredProviders?.[0]?.deposit || 5000)).toLocaleString('en-IN')}
                  </span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    100% Refundable
                  </span>
                </div>
                <p className="text-[11.5px] text-amber-900/90 leading-relaxed font-normal">
                  A refundable security deposit of <strong>₹{(item.securityDeposit ?? (filteredProviders?.[0]?.deposit || 5000)).toLocaleString('en-IN')}</strong> is settled directly with the rental partner upon delivery and return inspection. It is separate from the daily rental price and is not included in the platform checkout total.
                </p>
              </div>
            </div>
          </div>

          {/* Column C: Specifications & Compliance */}
          <div className="lg:col-span-3 bg-[#F8FAFC] lg:bg-transparent lg:border-l lg:border-slate-200 lg:pl-6 p-4 lg:p-0 rounded-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#9C4119]" />
                Specifications &amp; Compliance
              </h3>
            </div>

            {item.specifications && item.specifications.length > 0 ? (
              <ul className="space-y-2">
                {item.specifications.slice(0, 5).map((spec, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-slate-700 bg-white/70 lg:bg-slate-50/80 p-2 rounded-xl border border-slate-100"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                        {spec.label}
                      </span>
                      <span className="font-semibold text-slate-800 break-words leading-tight">
                        {spec.value}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : item.includedAccessories && item.includedAccessories.length > 0 ? (
              <ul className="space-y-2">
                {item.includedAccessories.map((acc, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-medium text-slate-800">{acc}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Standard medical equipment specifications registered on file with partner hub.
              </p>
            )}

            {item.specifications && item.specifications.length > 5 && (
              <button
                type="button"
                onClick={() => setShowMoreModal(true)}
                className="text-[11px] font-bold text-[#1A73E8] hover:underline inline-flex items-center gap-1 pt-1 cursor-pointer"
              >
                + View all {item.specifications.length} specifications
              </button>
            )}
          </div>
        </div>
      </div>



      {/* 4. "Available Rentals Near You" Section Header */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Available Rentals Near You
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose from verified rental providers offering this equipment.
          </p>
        </div>

        {/* Filters / Sort Controls */}
        <div className="flex items-center gap-2.5">
          {/* Sort By Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#9C4119]"
            >
              <option value="price_asc">Sort by: Price (Low to High)</option>
              <option value="price_desc">Sort by: Price (High to Low)</option>
              <option value="distance">Sort by: Nearest Distance</option>
              <option value="rating">Sort by: Highest Rated</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Distance Filter */}
          <div className="relative">
            <select
              value={distanceRadius}
              onChange={(e) => setDistanceRadius(Number(e.target.value))}
              className="appearance-none pl-7 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#9C4119]"
            >
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
              <option value={20}>Within 20 km</option>
              <option value={50}>Within 50 km</option>
            </select>
            <MapPin className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 5. Provider Comparison Cards */}
      <div className="space-y-3.5">
        {filteredProviders.map((provider) => (
          <div
            key={provider.id}
            className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              {/* Left Column: Image + Store Name & Location */}
              <div className="flex items-start gap-4 min-w-[280px]">
                <div
                  className="w-20 h-20 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 shrink-0 cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center p-1.5"
                  onClick={() => setSelectedProviderModal(provider)}
                  title="Click to view partner business details, banner and logo"
                >
                  {provider.logo ? (
                    <img
                      src={provider.logo}
                      alt={provider.name}
                      className="w-full h-full object-contain rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/equipment/store-1.jpg';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-[#9C4119] font-black text-xl">
                      {provider.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedProviderModal(provider)}
                      className="text-left font-bold text-slate-900 text-sm sm:text-base hover:text-[#9C4119] hover:underline cursor-pointer transition-colors"
                      title="Click to view partner business details, banner and logo"
                    >
                      {provider.name}
                    </button>
                    {provider.verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                        Verified Partner
                      </span>
                    )}
                  </div>

                  {/* Rating */}
                  {provider.rating && provider.rating > 0 && provider.reviewCount && provider.reviewCount > 0 ? (
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      <span className="font-bold text-slate-900">{provider.rating}</span>
                      <span className="text-slate-500 font-medium">({provider.reviewCount} reviews)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div className="flex items-center gap-0.5 text-slate-300">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-3 h-3 text-slate-200" />
                        ))}
                      </div>
                      <span className="text-xs text-slate-400">No reviews yet</span>
                    </div>
                  )}

                  {/* Address */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{provider.location}</span>
                  </div>

                  {/* Distance */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{provider.distanceText}</span>
                  </div>
                </div>
              </div>

              {/* Middle Column 1: Rental Price */}
              <div className="lg:border-l lg:border-slate-100 lg:pl-6 space-y-1">
                <span className="text-xs font-semibold text-slate-500 block">Rental Price</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">₹{provider.rentalPrice}</span>
                  <span className="text-xs font-semibold text-slate-600">/ day</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Deposit: <span className="font-bold text-slate-800">₹{provider.deposit.toLocaleString('en-IN')}</span> <span className="text-emerald-600 font-semibold">(Refundable)</span>
                </div>
              </div>

              {/* Middle Column 2: Stock & Delivery */}
              <div className="lg:border-l lg:border-slate-100 lg:pl-6 space-y-2">
                <div>
                  {!provider.inStock || (provider.availableStock !== undefined && provider.availableStock <= 0) ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      Out of Stock
                    </span>
                  ) : null}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{provider.deliveryType}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pl-5">{provider.deliveryEst}</p>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex flex-col items-center justify-center gap-2 pt-2 lg:pt-0 lg:pl-4">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={!provider.inStock || (provider.availableStock !== undefined && provider.availableStock <= 0)}
                    onClick={() => handleSelectRental(provider)}
                    className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-2xs flex items-center justify-center gap-1.5 ${
                      !provider.inStock || (provider.availableStock !== undefined && provider.availableStock <= 0)
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-[#9C4119] hover:bg-[#853512] text-white cursor-pointer'
                    }`}
                  >
                    <span>
                      {!provider.inStock || (provider.availableStock !== undefined && provider.availableStock <= 0)
                        ? 'Out of Stock'
                        : 'Select Rental'}
                    </span>
                  </button>
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0 hidden sm:block" />
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProviderModal(provider)}
                  className="text-xs text-[#1A73E8] hover:underline font-semibold cursor-pointer"
                >
                  View Provider Details
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredProviders.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <p className="text-sm font-semibold">No rental providers found within {distanceRadius} km.</p>
            <button
              type="button"
              onClick={() => setDistanceRadius(50)}
              className="mt-3 text-xs text-[#9C4119] font-bold hover:underline"
            >
              Expand radius to 50 km
            </button>
          </div>
        )}
      </div>

      {/* 6. Modal: Detailed Equipment Specs & Care Guidelines */}
      {showMoreModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{item.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Full Clinical Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#9C4119]" />
                Full Clinical Description
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                {item.fullDescription}
              </p>
            </div>

            {/* Technical Specifications Table */}
            {item.specifications && item.specifications.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Technical Specifications
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {item.specifications.map((spec, i) => (
                    <div
                      key={i}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-slate-500">{spec.label}</span>
                      <span className="font-bold text-slate-900">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Included Accessories */}
            {item.includedAccessories && item.includedAccessories.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Sanitized Accessories Included
                </h4>
                <ul className="space-y-2">
                  {item.includedAccessories.map((acc, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{acc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Safety Guidelines */}
            {item.safetyGuidelines && item.safetyGuidelines.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Safety & Operating Guidelines
                </h4>
                <ul className="space-y-2">
                  {item.safetyGuidelines.map((guide, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <Shield className="w-4 h-4 text-[#C26532] shrink-0 mt-0.5" />
                      <span>{guide}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Close Button */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMoreModal(false)}
                className="px-5 py-2.5 bg-[#9C4119] hover:bg-[#853512] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Specifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Verified Provider Business & Social Profile with distinct Banner & Logo */}
      <PartnerProfileModal
        isOpen={Boolean(selectedProviderModal)}
        onClose={() => setSelectedProviderModal(null)}
        partner={
          selectedProviderModal
            ? {
                providerId: selectedProviderModal.id,
                name: selectedProviderModal.name,
                logo: selectedProviderModal.logo,
                banner: selectedProviderModal.banner,
                address: selectedProviderModal.address,
                location: selectedProviderModal.location,
                phone: selectedProviderModal.phone,
                email: selectedProviderModal.email,
                rating: selectedProviderModal.rating,
                reviewCount: selectedProviderModal.reviewCount,
                rentalPrice: selectedProviderModal.rentalPrice,
              }
            : null
        }
        onSelectRental={
          selectedProviderModal
            ? () => handleSelectRental(selectedProviderModal)
            : undefined
        }
      />
    </div>
  );
};

export default EquipmentDetailScreen;
