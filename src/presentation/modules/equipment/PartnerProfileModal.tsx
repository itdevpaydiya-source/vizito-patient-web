import MediaImage from '../../components/MediaImage';
import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Phone,
  Mail,
  Clock,
  Star,
  ShieldCheck,
  Building2,
  Sparkles,
  Globe,
  ExternalLink,
  Award,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import type { RentalProviderProfile } from './types';
import { equipmentService } from './equipmentService';

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

export interface InitialPartnerInfo {
  providerId?: string;
  name?: string;
  logo?: string;
  banner?: string;
  address?: string;
  location?: string;
  phone?: string;
  email?: string;
  rating?: number;
  reviewCount?: number;
  rentalPrice?: number;
}

interface PartnerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: InitialPartnerInfo | null;
  onSelectRental?: () => void;
}

export const PartnerProfileModal: React.FC<PartnerProfileModalProps> = ({
  isOpen,
  onClose,
  partner,
  onSelectRental,
}) => {
  const [profileData, setProfileData] = useState<RentalProviderProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !partner?.providerId) {
      setProfileData(null);
      return;
    }

    setLoading(true);
    equipmentService
      .getProviderProfile(partner.providerId)
      .then((data) => {
        if (data) {
          setProfileData(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load partner profile:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, partner?.providerId]);

  if (!isOpen || !partner) return null;

  // Distinct Banner & Logo
  const bannerUrl =
    profileData?.banner ||
    partner.banner ||
    '';

  const logoUrl =
    profileData?.logo ||
    partner.logo ||
    '';

  const businessName =
    profileData?.displayName ||
    profileData?.businessName ||
    profileData?.business_name ||
    partner.name ||
    'Healthcare Rental Partner';

  const partnerCode =
    profileData?.partnerCode ||
    profileData?.partner_code ||
    '';

  const ownerName =
    profileData?.ownerName ||
    profileData?.owner_name ||
    '';

  const specialization =
    profileData?.specialization ||
    '';

  const address =
    profileData?.address ||
    partner.address ||
    partner.location ||
    '';

  const phone =
    profileData?.phone ||
    partner.phone ||
    '';

  const email =
    profileData?.email ||
    partner.email ||
    '';

  const website =
    profileData?.website ||
    profileData?.socialLinks?.website ||
    profileData?.social_links?.website ||
    '';

  const hasRatings = Boolean(
    partner.rating && partner.rating > 0 && partner.reviewCount && partner.reviewCount > 0
  );
  const rating = hasRatings ? partner.rating : null;
  const reviewCount = hasRatings ? partner.reviewCount : 0;

  const establishedYear =
    profileData?.establishedYear ||
    profileData?.established_year ||
    null;

  const deliveryRadius =
    profileData?.serviceAreaRadius ||
    profileData?.service_area_radius ||
    null;

  const aboutText =
    profileData?.about ||
    (profileData as any)?.overview ||
    '';

  const hygieneText =
    profileData?.hygieneStandards ||
    profileData?.hygiene_standards ||
    '';

  const depositText =
    profileData?.securityDepositPolicy ||
    profileData?.security_deposit_policy ||
    '';

  const links = ((profileData?.socialLinks || profileData?.social_links || {}) as Record<string, string | undefined>);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200/90 w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl my-auto flex flex-col relative">
        {/* 1. SEPARATE HERO BANNER (Top) */}
        <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-gradient-to-r from-amber-700 via-orange-600 to-amber-900 shrink-0">
          {bannerUrl ? (
            <MediaImage kind="business" businessType="equipment"
              src={bannerUrl}
              name={`${businessName} Banner`}
              className="w-full h-full object-cover opacity-90"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-amber-700 via-orange-600 to-amber-900 flex items-center justify-center opacity-90">
              <Building2 className="w-16 h-16 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/30" />

          {/* Banner Tag */}
          <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 text-slate-800 backdrop-blur-md shadow-xs">
            <Award className="w-3.5 h-3.5 text-[#9C4119]" />
            <span>Certified Rental Partner</span>
          </div>

          {/* Close Button on Banner */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-2 rounded-full bg-black/45 hover:bg-black/70 text-white backdrop-blur-md transition-colors cursor-pointer shadow-md"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. SEPARATE LOGO & IDENTITY BAR */}
        <div className="px-5 sm:px-6 pt-0 pb-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 -mt-12 sm:-mt-14 relative z-10">
            {/* Logo Avatar Box (Separated cleanly from banner) */}
            <div className="flex items-end gap-3.5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1.5 shadow-xl border-2 border-white ring-1 ring-slate-200/90 shrink-0 overflow-hidden flex items-center justify-center">
                <MediaImage kind="business" businessType="equipment"
                    src={logoUrl}
                    name={`${businessName} Logo`}
                    className="w-full h-full object-contain rounded-xl"
                  />
              </div>

              {/* Title & Verified Badge */}
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                    {businessName}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                    Verified Partner
                  </span>
                </div>

                {specialization ? (
                  <p className="text-xs text-slate-500 font-medium truncate">
                    {specialization}
                  </p>
                ) : null}

                <div className="flex items-center gap-2.5 text-[11px] text-slate-500 flex-wrap">
                  {partnerCode ? (
                    <span className="font-mono bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.2 rounded">
                      ID: {partnerCode}
                    </span>
                  ) : null}
                  {ownerName ? (
                    <span>
                      Owner: <strong className="text-slate-700">{ownerName}</strong>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. SCROLLABLE DETAILS BODY */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {loading && (
            <div className="py-1.5 px-3 bg-amber-50 border border-amber-200/70 rounded-xl text-amber-900 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Fetching latest verified business details...</span>
            </div>
          )}

          {/* Quick Metrics (3 Cards) */}
          <div className="grid grid-cols-3 gap-2.5 text-xs">
            {/* Rating */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10.5px] text-slate-400 block uppercase font-bold tracking-wider">
                Rating
              </span>
              {hasRatings ? (
                <>
                  <div className="flex items-center justify-center gap-1 font-black text-slate-900 text-sm mt-0.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{rating}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal block">
                    {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-bold text-slate-700 text-xs mt-1 block">
                    New Partner
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                    No reviews yet
                  </span>
                </>
              )}
            </div>

            {/* Established */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10.5px] text-slate-400 block uppercase font-bold tracking-wider">
                Established
              </span>
              {establishedYear ? (
                <>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">
                    {establishedYear}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold block">
                    Verified Hub
                  </span>
                </>
              ) : (
                <>
                  <span className="font-bold text-slate-700 text-xs mt-1 block">
                    Active
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                    Verified Hub
                  </span>
                </>
              )}
            </div>

            {/* Service Radius */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
              <span className="text-[10.5px] text-slate-400 block uppercase font-bold tracking-wider">
                Service Radius
              </span>
              {deliveryRadius ? (
                <>
                  <span className="font-black text-slate-900 text-sm mt-0.5 block">
                    {deliveryRadius} km
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal block">
                    Express Delivery
                  </span>
                </>
              ) : (
                <>
                  <span className="font-bold text-slate-700 text-xs mt-1 block">
                    Doorstep
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                    Direct Delivery
                  </span>
                </>
              )}
            </div>
          </div>

          {/* About Business */}
          {aboutText ? (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#9C4119]" />
                About Business
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                {aboutText}
              </p>
            </div>
          ) : null}

          {/* Showroom & Warehouse Location + Contacts */}
          {(address && address !== 'Address on file') || phone || email ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#9C4119]" />
                Contact Details
              </h3>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
                {/* Showroom Address */}
                {address && address !== 'Address on file' ? (
                  <div className="flex items-start gap-2.5 text-slate-700">
                    <MapPin className="w-4 h-4 text-[#1A73E8] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-slate-900">Showroom / Warehouse Address:</span>
                      <p className="text-slate-600 leading-relaxed mt-0.5">{address}</p>
                    </div>
                  </div>
                ) : null}

                {/* Helpline Phone */}
                {phone ? (
                  <div className="flex items-start gap-2.5 text-slate-700">
                    <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-slate-900">Support Helpline:</span>
                      <a
                        href={`tel:${phone}`}
                        className="text-emerald-700 font-semibold hover:underline mt-0.5 inline-block"
                      >
                        {phone}
                      </a>
                    </div>
                  </div>
                ) : null}

                {/* Email */}
                {email ? (
                  <div className="flex items-start gap-2.5 text-slate-700">
                    <Mail className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-slate-900">Official Email:</span>
                      <a
                        href={`mailto:${email}`}
                        className="text-sky-700 font-semibold hover:underline mt-0.5 inline-block"
                      >
                        {email}
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Social & Digital Presence: Only render real links that the partner entered */}
          {(() => {
            const hasWebsite = Boolean(website && website.trim());
            const hasInstagram = Boolean(links.instagram && links.instagram.trim());
            const hasFacebook = Boolean(links.facebook && links.facebook.trim());
            const hasLinkedIn = Boolean(links.linkedin && links.linkedin.trim());
            const hasTwitter = Boolean(links.twitter && links.twitter.trim());
            const hasYouTube = Boolean(links.youtube && links.youtube.trim());
            const hasAnySocial = hasWebsite || hasInstagram || hasFacebook || hasLinkedIn || hasTwitter || hasYouTube;

            if (!hasAnySocial) return null;

            return (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#9C4119]" />
                  Social &amp; Digital Presence
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {hasWebsite && (
                    <a
                      href={website.startsWith('http') ? website : `https://${website}`}
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
                  )}

                  {hasFacebook && links.facebook && (
                    <a
                      href={
                        links.facebook.startsWith('http')
                          ? links.facebook
                          : `https://${links.facebook.startsWith('facebook.com') ? '' : 'facebook.com/'}${links.facebook}`
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
                  )}

                  {hasInstagram && links.instagram && (
                    <a
                      href={
                        links.instagram.startsWith('http')
                          ? links.instagram
                          : `https://instagram.com/${links.instagram.replace('@', '')}`
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
                  )}

                  {hasLinkedIn && links.linkedin && (
                    <a
                      href={
                        links.linkedin.startsWith('http')
                          ? links.linkedin
                          : `https://linkedin.com/in/${links.linkedin}`
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
                  )}

                  {hasTwitter && links.twitter && (
                    <a
                      href={
                        links.twitter.startsWith('http')
                          ? links.twitter
                          : `https://x.com/${links.twitter.replace('@', '')}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl border border-slate-200 flex items-center justify-between group transition-colors"
                    >
                      <div className="flex items-center gap-2 text-slate-900">
                        <SocialTwitterIcon className="w-4 h-4 text-slate-900 shrink-0" />
                        <span className="text-xs font-semibold">Twitter</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-slate-900" />
                    </a>
                  )}

                  {hasYouTube && links.youtube && (
                    <a
                      href={
                        links.youtube.startsWith('http')
                          ? links.youtube
                          : `https://youtube.com/@${links.youtube}`
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
                  )}
                </div>
              </div>
            );
          })()}

          {/* Hygiene & Security Deposit Policies: Only render if real policies are saved */}
          {hygieneText || depositText ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {hygieneText ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200/70 rounded-2xl space-y-1">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700 shrink-0" /> Hygiene &amp; Sanitization
                  </span>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    {hygieneText}
                  </p>
                </div>
              ) : null}

              {depositText ? (
                <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-2xl space-y-1">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" /> Deposit Policy
                  </span>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    {depositText}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* 4. FOOTER ACTION */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Close
          </button>
          {onSelectRental && partner.rentalPrice && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onSelectRental();
              }}
              className="flex-1 py-2.5 bg-[#9C4119] hover:bg-[#853512] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Select This Rental (₹{partner.rentalPrice}/day)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerProfileModal;
