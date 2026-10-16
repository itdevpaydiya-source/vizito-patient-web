export type EquipmentCategory =
  | 'all'
  | 'respiratory'
  | 'hospital_beds'
  | 'mobility'
  | 'monitoring'
  | 'support_comfort';

export interface EquipmentSpecificationItem {
  label: string;
  value: string;
}

export interface PatientEquipmentItem {
  id: string;
  name: string;
  category?: EquipmentCategory;
  categoryLabel?: string;
  dailyRate: number;
  securityDeposit: number; // Informational only — NEVER added to patient price or total
  minDurationDays: number;
  maxDurationDays: number;
  imageUrl: string;
  additionalImages: string[];
  shortDescription: string;
  fullDescription: string;
  specifications: EquipmentSpecificationItem[];
  includedAccessories: string[];
  safetyGuidelines: string[];
  clinicalUsageNotice: string;
  isAvailable: boolean;
  deliveryAvailable: boolean;
  deliverySlabs?: Array<{ id?: string; min_km: number; max_km: number; charge: number }>;
  estimatedDeliveryHours: number;
  manufacturer: string;
  modelNumber: string;
  rating: number;
  reviewCount: number;
  totalStock?: number;
  availableStock?: number;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
  providerId?: string;
  providerName?: string;
  providerPhone?: string;
  providerEmail?: string;
  providerAddress?: string;
  providerLocation?: string;
  providerZipcode?: string;
  providerLatitude?: number;
  providerLongitude?: number;
  lowestRentalPrice?: number;
  availableRentals?: PatientEquipmentItem[];
  providerDetails?: RentalProviderProfile;
}

export interface RentalProviderProfile {
  id: string;
  partner_code: string;
  partnerCode?: string;
  business_name: string;
  businessName?: string;
  display_name?: string;
  displayName?: string;
  owner_name?: string;
  ownerName?: string;
  phone: string;
  email: string;
  website?: string;
  address: string;
  location: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  verified: boolean;
  verification_badge?: string;
  established_year?: number;
  establishedYear?: number;
  about?: string;
  service_area_radius?: number;
  serviceAreaRadius?: number;
  hygiene_standards?: string;
  hygieneStandards?: string;
  security_deposit_policy?: string;
  securityDepositPolicy?: string;
  booking_window?: number;
  cancellation_window?: number;
  social_links?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    website?: string;
  };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    website?: string;
  };
}

export interface RentalQuote {
  equipmentId: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  dailyRate: number;
  securityDeposit: number; // Informational amount — separate from total
  rentalFee: number;
  deliveryFee: number;
  totalOrderValue: number; // Strictly: rentalFee + deliveryFee
  depositNotice: string;
}

export type RentalPaymentStatus =
  | 'not_initiated'
  | 'pending'
  | 'successful'
  | 'failed'
  | 'cancelled';

export type RentalOrderStatus =
  | 'awaiting_confirmation'
  | 'payment_pending'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'out_for_delivery'
  | 'active'
  | 'return_requested'
  | 'return_scheduled'
  | 'return_inspection_pending'
  | 'completed';

export type ReturnInspectionStatus =
  | 'not_requested'
  | 'request_pending'
  | 'pickup_scheduled'
  | 'return_in_progress'
  | 'equipment_received'
  | 'inspection_pending'
  | 'cleared'
  | 'maintenance_required'
  | 'completed';

export interface DeliveryTimelineStep {
  title: string;
  description: string;
  timestamp?: string;
  completed: boolean;
  current?: boolean;
  status?: string;
  updaterRole?: string;
  note?: string;
}

export interface PatientRentalOrder {
  id: string;
  orderNumber: string;
  equipmentId: string;
  equipmentName: string;
  equipmentImage: string;
  categoryLabel?: string;
  quantity?: number;
  startDate: string;
  endDate: string;
  durationDays: number;
  dailyRate: number;
  securityDeposit?: number; // Informational amount only — NEVER added to patient price or total
  rentalFee: number;
  deliveryFee: number;
  totalOrderValue: number; // rentalFee + deliveryFee
  status: RentalOrderStatus;
  paymentStatus: RentalPaymentStatus;
  paymentMethod?: string;
  createdAt: string;
  deliveryAddress: {
    recipientName: string;
    phone: string;
    addressLine: string;
    city: string;
    pincode: string;
    instructions?: string;
  };
  deliveryTimeline: DeliveryTimelineStep[];
  allocatedAssetId?: string;
  providerConfirmationStatus?: 'pending' | 'accepted' | 'declined';
  rejectionReason?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  refundStatus?: 'none' | 'pending' | 'processed' | 'not_applicable';
  refundTransactionRef?: string;
  provider?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  returnDetails?: {
    requestedDate: string;
    pickupAddress: string;
    conditionNotes?: string;
    status: ReturnInspectionStatus;
    scheduledPickupSlot?: string;
    inspectionClearedAt?: string;
    collectedAt?: string;
  };
  deliveryStatus?: string;
  feedback?: {
    rating: number;
    review?: string;
    tags?: string[];
    submitted_at?: string;
  };
}

export interface EquipmentFilterState {
  search: string;
  category?: EquipmentCategory;
  priceSort: 'none' | 'low_to_high' | 'high_to_low';
  onlyAvailable: boolean;
}

