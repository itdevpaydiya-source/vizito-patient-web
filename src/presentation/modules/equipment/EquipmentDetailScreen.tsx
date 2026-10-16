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

const SocialFacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const SocialInstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const SocialTwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const SocialLinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

const SocialYouTubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface RentalProvider {
  id: string;
  productId?: string;
  name: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  location: string;
  distanceText: string;
  distanceKm: number;
  rentalPrice: number;
  deposit: number;
  inStock: boolean;
  availableStock?: number;
  deliveryType: string;
  deliveryEst: string;
  image: string;
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
  const [providerProfileData, setProviderProfileData] = useState<RentalProviderProfile | null>(null);
  const [loadingProviderProfile, setLoadingProviderProfile] = useState<boolean>(false);
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

        if (!allMatchingProducts.some((p) => p.id === data.id)) {
          allMatchingProducts.push(data);
        }

        // Sort by dailyRate ascending: lowest price product first
        allMatchingProducts.sort((a, b) => a.dailyRate - b.dailyRate);

        // Display the lowest price product as the featured product at the top
        const lowestPriceItem = allMatchingProducts[0];

        setItem({
          ...lowestPriceItem,
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

      const dist = pDist != null ? pDist : (calculatedDistance != null ? calculatedDistance : 0);
      const distText = dist != null ? `${dist} km away` : 'Address on file';

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
    let list = [...providers].filter((p) => p.distanceKm <= distanceRadius);
    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.rentalPrice - b.rentalPrice);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.rentalPrice - a.rentalPrice);
    } else if (sortBy === 'distance') {
      list.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    }
    return list;
  }, [providers, sortBy, distanceRadius]);

  const handleOpenProviderModal = async (provider: RentalProvider) => {
    setSelectedProviderModal(provider);
    setProviderProfileData(provider.providerDetails || null);
    setLoadingProviderProfile(true);
    try {
      const prof = await equipmentService.getProviderProfile(provider.id);
      if (prof) {
        setProviderProfileData(prof);
      }
    } catch (e) {
      console.warn('Failed to fetch provider profile:', e);
    } finally {
      setLoadingProviderProfile(false);
    }
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

            {/* 2 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Metric 1: Lowest Rental Price */}
              <div className="bg-[#FFFDF9] border border-[#FDE3CF] rounded-xl p-3 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Tag className="w-3.5 h-3.5 text-[#C26532] shrink-0" />
                  <span className="text-[11px] font-medium text-slate-500">Lowest Rental Price</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-xl font-black text-slate-900">₹{item.dailyRate}</span>
                  <span className="text-xs font-bold text-slate-700">/ day</span>
                </div>
              </div>

              {/* Metric 2: Distance */}
              <div className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-[#1A73E8] shrink-0" />
                  <span className="text-[11px] font-medium text-slate-500">Distance from your address</span>
                </div>
                <div className="mt-2">
                  <span className="text-xl font-black text-slate-900">
                    {calculatedDistance != null ? `${calculatedDistance} km` : '--'}
                  </span>
                </div>
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
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img
                    src={provider.image}
                    alt={provider.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/equipment/store-1.jpg';
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      {provider.name}
                    </h3>
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

      {/* 7. Modal: Verified Provider Business & Social Profile */}
      {selectedProviderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 p-5 sm:p-6 my-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-700 font-bold text-lg">
                  {selectedProviderModal.image ? (
                    <img
                      src={selectedProviderModal.image}
                      alt={selectedProviderModal.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/equipment/store-1.jpg';
                      }}
                    />
                  ) : (
                    <span>{(providerProfileData?.businessName || selectedProviderModal.name).charAt(0)}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                      {providerProfileData?.businessName || selectedProviderModal.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                      Verified Partner
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                    {providerProfileData?.partnerCode && (
                      <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold text-[11px]">
                        ID: {providerProfileData.partnerCode}
                      </span>
                    )}
                    {providerProfileData?.ownerName && (
                      <span>Managed by: <strong className="text-slate-700">{providerProfileData.ownerName}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedProviderModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingProviderProfile && (
              <div className="py-1 px-3 bg-sky-50 border border-sky-100 rounded-lg text-sky-700 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                Loading latest partner business & social profile...
              </div>
            )}

            {/* Quick Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Established</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {providerProfileData?.establishedYear ? `Year ${providerProfileData.establishedYear}` : 'Verified Partner'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Delivery Radius</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {providerProfileData?.serviceAreaRadius ? `Within ${providerProfileData.serviceAreaRadius} km` : selectedProviderModal.distanceText}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-slate-400 block text-[11px]">Customer Rating</span>
                <div className="flex items-center gap-1 font-bold text-slate-900 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{selectedProviderModal.rating && selectedProviderModal.rating > 0 ? selectedProviderModal.rating : '4.8'}</span>
                  <span className="text-slate-400 font-normal text-[11px]">({selectedProviderModal.reviewCount || 12} reviews)</span>
                </div>
              </div>
            </div>

            {/* About / Business Info */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#9C4119]" />
                About Business
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                {providerProfileData?.about ||
                  `${providerProfileData?.businessName || selectedProviderModal.name} is an authorized Vizito healthcare equipment partner providing certified medical grade beds, mobility devices, and life support apparatus with biomedical inspection and home installation.`}
              </p>
            </div>

            {/* Business Contact & Showroom Location */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#9C4119]" />
                Showroom & Contact Details
              </h4>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5 text-xs">
                {/* Showroom Address */}
                <div className="flex items-start gap-2.5 text-slate-700">
                  <MapPin className="w-4 h-4 text-[#1A73E8] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">Showroom / Warehouse Address:</span>
                    <p className="text-slate-600 leading-relaxed mt-0.5">
                      {providerProfileData?.address || selectedProviderModal.address}
                      {providerProfileData?.location && !providerProfileData.address?.includes(providerProfileData.location)
                        ? `, ${providerProfileData.location}`
                        : ''}
                      {providerProfileData?.pincode ? ` - ${providerProfileData.pincode}` : ''}
                    </p>
                  </div>
                </div>

                {/* Operating Hours */}
                <div className="flex items-start gap-2.5 text-slate-700">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-slate-900">Operating Hours:</span>
                    <p className="text-slate-600 mt-0.5">{selectedProviderModal.hours}</p>
                  </div>
                </div>

                {/* Phone */}
                {(providerProfileData?.phone || selectedProviderModal.phone) && (
                  <div className="flex items-start gap-2.5 text-slate-700">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-slate-900">Support & Dispatch Helpline:</span>
                      <a
                        href={`tel:${providerProfileData?.phone || selectedProviderModal.phone}`}
                        className="text-emerald-700 font-semibold hover:underline mt-0.5 inline-block"
                      >
                        {providerProfileData?.phone || selectedProviderModal.phone}
                      </a>
                    </div>
                  </div>
                )}

                {/* Email */}
                {(providerProfileData?.email || selectedProviderModal.email) && (
                  <div className="flex items-start gap-2.5 text-slate-700">
                    <Mail className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-slate-900">Official Support Email:</span>
                      <a
                        href={`mailto:${providerProfileData?.email || selectedProviderModal.email}`}
                        className="text-sky-700 font-semibold hover:underline mt-0.5 inline-block"
                      >
                        {providerProfileData?.email || selectedProviderModal.email}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Social & Digital Presence */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#9C4119]" />
                Social & Digital Presence
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* Website */}
                {(providerProfileData?.socialLinks?.website || providerProfileData?.website) ? (
                  <a
                    href={
                      (providerProfileData?.socialLinks?.website || providerProfileData?.website)?.startsWith('http')
                        ? (providerProfileData?.socialLinks?.website || providerProfileData?.website)
                        : `https://${providerProfileData?.socialLinks?.website || providerProfileData?.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/80 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2 text-slate-700">
                      <Globe className="w-4 h-4 text-sky-600 shrink-0" />
                      <span className="text-xs font-semibold group-hover:text-slate-900">Website</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-700" />
                  </a>
                ) : (
                  <div className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-400 text-xs">
                    <Globe className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>Website: Pending</span>
                  </div>
                )}

                {/* Instagram */}
                {providerProfileData?.socialLinks?.instagram ? (
                  <a
                    href={
                      providerProfileData.socialLinks.instagram.startsWith('http')
                        ? providerProfileData.socialLinks.instagram
                        : `https://instagram.com/${providerProfileData.socialLinks.instagram.replace('@', '')}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-pink-50/60 hover:bg-pink-100/60 rounded-xl border border-pink-200/60 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2 text-pink-700">
                      <SocialInstagramIcon className="w-4 h-4 text-pink-600 shrink-0" />
                      <span className="text-xs font-semibold">Instagram</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-pink-400 group-hover:text-pink-700" />
                  </a>
                ) : (
                  <div className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-400 text-xs">
                    <SocialInstagramIcon className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>Instagram</span>
                  </div>
                )}

                {/* Facebook */}
                {providerProfileData?.socialLinks?.facebook ? (
                  <a
                    href={
                      providerProfileData.socialLinks.facebook.startsWith('http')
                        ? providerProfileData.socialLinks.facebook
                        : `https://facebook.com/${providerProfileData.socialLinks.facebook}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-blue-50/60 hover:bg-blue-100/60 rounded-xl border border-blue-200/60 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2 text-blue-700">
                      <SocialFacebookIcon className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-xs font-semibold">Facebook</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-blue-400 group-hover:text-blue-700" />
                  </a>
                ) : (
                  <div className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-400 text-xs">
                    <SocialFacebookIcon className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>Facebook</span>
                  </div>
                )}

                {/* LinkedIn */}
                {providerProfileData?.socialLinks?.linkedin ? (
                  <a
                    href={
                      providerProfileData.socialLinks.linkedin.startsWith('http')
                        ? providerProfileData.socialLinks.linkedin
                        : `https://linkedin.com/in/${providerProfileData.socialLinks.linkedin}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-sky-50/60 hover:bg-sky-100/60 rounded-xl border border-sky-200/60 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2 text-sky-700">
                      <SocialLinkedInIcon className="w-4 h-4 text-sky-600 shrink-0" />
                      <span className="text-xs font-semibold">LinkedIn</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-sky-400 group-hover:text-sky-700" />
                  </a>
                ) : (
                  <div className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-400 text-xs">
                    <SocialLinkedInIcon className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>LinkedIn</span>
                  </div>
                )}

                {/* Twitter / X */}
                {providerProfileData?.socialLinks?.twitter ? (
                  <a
                    href={
                      providerProfileData.socialLinks.twitter.startsWith('http')
                        ? providerProfileData.socialLinks.twitter
                        : `https://x.com/${providerProfileData.socialLinks.twitter.replace('@', '')}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2 text-slate-900">
                      <SocialTwitterIcon className="w-4 h-4 text-slate-900 shrink-0" />
                      <span className="text-xs font-semibold">X / Twitter</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-900" />
                  </a>
                ) : (
                  <div className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-400 text-xs">
                    <SocialTwitterIcon className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>Twitter</span>
                  </div>
                )}

                {/* YouTube */}
                {providerProfileData?.socialLinks?.youtube ? (
                  <a
                    href={
                      providerProfileData.socialLinks.youtube.startsWith('http')
                        ? providerProfileData.socialLinks.youtube
                        : `https://youtube.com/@${providerProfileData.socialLinks.youtube}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-rose-50/60 hover:bg-rose-100/60 rounded-xl border border-rose-200/60 flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2 text-rose-700">
                      <SocialYouTubeIcon className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="text-xs font-semibold">YouTube</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-rose-400 group-hover:text-rose-700" />
                  </a>
                ) : (
                  <div className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-400 text-xs">
                    <SocialYouTubeIcon className="w-4 h-4 text-slate-300 shrink-0" />
                    <span>YouTube</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hygiene & Security Deposit Policies */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200/70 rounded-xl space-y-1">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" /> Hygiene & Sanitization
                </span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  {providerProfileData?.hygieneStandards ||
                    'Clinical grade multi-point disinfection and UV-C sterilization performed before every dispatch.'}
                </p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-xl space-y-1">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" /> Deposit Policy
                </span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {providerProfileData?.securityDepositPolicy ||
                    '100% refundable upon equipment pickup and condition verification.'}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedProviderModal(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const prov = selectedProviderModal;
                  setSelectedProviderModal(null);
                  handleSelectRental(prov);
                }}
                className="flex-1 py-2.5 bg-[#9C4119] hover:bg-[#853512] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Select This Rental (₹{selectedProviderModal.rentalPrice}/day)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentDetailScreen;
