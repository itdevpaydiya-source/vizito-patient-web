import apiClient from '../../../services';
import type {
  PatientEquipmentItem,
  PatientRentalOrder,
  RentalQuote,
  EquipmentFilterState,
  RentalOrderStatus,
  RentalPaymentStatus,
  DeliveryTimelineStep,
} from './types';

export const REQUIRED_BACKEND_UNAVAILABLE_MESSAGE =
  'This feature is not implemented yet. The required backend/API integration is unavailable. No data has been saved.';

export const INFORMATIONAL_SECURITY_DEPOSIT_NOTICE =
  'A refundable security deposit may be collected and refunded directly by the rental provider. It is separate from the rental price and is not included in the total order value.';

export interface ServiceOperationResult<T = void> {
  success: boolean;
  isSupported: boolean;
  message: string;
  data?: T;
}

function resolveImageUrl(path?: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  const base = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

function mapBackendProductToEquipmentItem(p: any): PatientEquipmentItem {
  return {
    id: String(p.id),
    name: p.name,
    dailyRate: Number(p.daily_rental_price),
    securityDeposit: Number(p.deposit_amount || 0),
    minDurationDays: p.min_rental_days || 1,
    maxDurationDays: p.max_rental_days || 90,
    imageUrl: resolveImageUrl(p.primary_image_url) || '/equipment/hospital-bed.jpg',
    additionalImages: p.gallery_images || [],
    shortDescription: p.brand ? `${p.brand} ${p.model_number || ''}` : p.name,
    fullDescription: p.description || p.name,
    specifications: p.specifications
      ? Object.entries(p.specifications)
          .filter(
            ([label]) =>
              !['average_rating', 'review_count', 'customer_reviews'].includes(label),
          )
          .map(([label, value]) => ({ label, value: String(value) }))
      : [],
    includedAccessories: p.highlights || [],
    safetyGuidelines: ['Operate strictly per manufacturer instructions.'],
    clinicalUsageNotice: 'Certified clinical equipment sanitized prior to delivery.',
    isAvailable: p.is_available ?? (p.available_quantity > 0),
    deliveryAvailable: true,
    estimatedDeliveryHours: 24,
    manufacturer: p.brand || '',
    modelNumber: p.model_number || '',
    rating: Number(p.rating ?? p.specifications?.average_rating ?? 0),
    reviewCount: Number(p.review_count ?? p.specifications?.review_count ?? 0),
    totalStock: p.stock_quantity ?? p.available_quantity,
    availableStock: p.available_quantity ?? 1,
    approvalStatus: 'approved',
    providerId: p.provider_id,
    providerName: p.provider_name,
    providerPhone: p.provider_phone,
    providerEmail: p.provider_email,
    providerAddress: p.provider_address,
    providerLocation: p.provider_location,
    providerZipcode: p.provider_zipcode,
    providerLatitude: p.provider_latitude ? Number(p.provider_latitude) : undefined,
    providerLongitude: p.provider_longitude ? Number(p.provider_longitude) : undefined,
  };
}

function mapBackendOrderToPatientOrder(o: any): PatientRentalOrder {
  const retSched = o.delivery_address?.return_schedule;
  
  let status: RentalOrderStatus = 'awaiting_confirmation';
  if (o.status === 'REJECTED') {
    status = 'rejected';
  } else if (o.status === 'CANCELLED') {
    status = 'cancelled';
  } else if (o.status === 'COMPLETED') {
    status = 'completed';
  } else if (retSched) {
    if (retSched.status === 'inspected' || o.status === 'COMPLETED') {
      status = 'completed';
    } else if (retSched.status === 'collected_awaiting_inspection') {
      status = 'return_inspection_pending';
    } else {
      status = 'return_scheduled';
    }
  } else if (
    o.delivery_address?.delivery_status === 'delivered' ||
    o.delivery_address?.delivery_otp?.verified
  ) {
    status = 'active';
  } else if (
    o.delivery_address?.delivery_status === 'out_for_delivery' ||
    o.status === 'OUT_FOR_DELIVERY'
  ) {
    status = 'out_for_delivery';
  } else if (o.status === 'NEW') {
    status = 'awaiting_confirmation';
  } else if (o.status === 'ACCEPTED') {
    status = 'confirmed';
  } else if (o.status === 'ACTIVE') {
    status = 'active';
  } else {
    status = (o.status?.toLowerCase() as RentalOrderStatus) || 'awaiting_confirmation';
  }

  const returnDetails = retSched
    ? {
        requestedDate: retSched.requested_date,
        pickupAddress: retSched.pickup_address,
        conditionNotes: retSched.condition_notes,
        status: (o.status === 'COMPLETED'
          ? 'completed'
          : retSched.status === 'collected_awaiting_inspection'
          ? 'equipment_received'
          : 'pickup_scheduled') as any,
        scheduledPickupSlot: retSched.pickup_window,
        collectedAt: retSched.collected_at,
      }
    : undefined;

  const rawHistory: any[] = Array.isArray(o.delivery_address?.status_history)
    ? o.delivery_address.status_history
    : [];

  const partnerName =
    o.provider?.name ||
    o.provider?.business_name ||
    o.provider_name ||
    'Rental Partner';

  let timeline: DeliveryTimelineStep[] = [];

  if (rawHistory.length > 0) {
    timeline = rawHistory.map((item: any, idx: number) => {
      const isLatest = idx === rawHistory.length - 1;
      const role = String(item.role || item.updaterRole || '').toUpperCase();
      let updaterLabel = item.updaterName;

      if (!updaterLabel) {
        if (role === 'PROVIDER') updaterLabel = partnerName;
        else if (role === 'PATIENT') updaterLabel = 'You (Patient)';
        else if (role === 'SUPER_ADMIN' || role === 'ADMIN') updaterLabel = 'Vizito Support';
        else updaterLabel = partnerName;
      }

      return {
        title: item.title || item.status,
        description: item.note || `Status updated to ${item.status}`,
        timestamp: item.timestamp,
        completed: true,
        current: isLatest,
        status: item.status,
        updaterRole: updaterLabel,
        note: item.note,
      };
    });
  } else {
    timeline = [
      {
        title: 'Rental Request Placed',
        description: `Order ${o.order_number} received`,
        timestamp: o.created_at,
        completed: true,
        current: o.status === 'NEW',
        updaterRole: 'You (Patient)',
      },
    ];

    if (['ACCEPTED', 'OUT_FOR_DELIVERY', 'ACTIVE', 'COMPLETED'].includes(o.status)) {
      timeline.push({
        title: 'Order Confirmed & Payment Received',
        description: 'Payment successful. Equipment reserved and confirmed automatically for dispatch.',
        timestamp: o.updated_at || o.created_at,
        completed: true,
        current: o.status === 'ACCEPTED',
        updaterRole: 'System',
      });
    }

    if (retSched) {
      timeline.push({
        title: 'Return Pickup Scheduled',
        description: `Pickup requested for ${retSched.requested_date} (${retSched.pickup_window || '10:00 AM – 2:00 PM'})`,
        timestamp: retSched.scheduled_at,
        completed: true,
        current: retSched.status !== 'collected_awaiting_inspection' && o.status !== 'COMPLETED',
        updaterRole: 'You (Patient)',
      });
    }

    if (retSched?.status === 'collected_awaiting_inspection' || retSched?.collected_at) {
      timeline.push({
        title: 'Equipment Collected',
        description: 'Equipment collected by provider. Undergoing return inspection.',
        timestamp: retSched.collected_at,
        completed: true,
        current: o.status !== 'COMPLETED',
        updaterRole: 'Rental Provider',
      });
    }

    if (o.status === 'COMPLETED') {
      timeline.push({
        title: 'Rental Completed',
        description: 'Return inspection passed. Order closed.',
        timestamp: o.updated_at,
        completed: true,
        current: false,
        updaterRole: 'Rental Provider',
      });
    }
  }

  return {
    id: String(o.id),
    orderNumber: o.order_number,
    equipmentId: String(o.product_id),
    equipmentName: o.product?.name || 'Medical Equipment',
    equipmentImage:
      resolveImageUrl(
        o.product?.primary_image_url ||
        (Array.isArray(o.product?.gallery_images) && o.product.gallery_images[0] ? o.product.gallery_images[0] : undefined) ||
        o.equipment_image ||
        o.equipmentImage ||
        o.image_url
      ) || '/equipment/hospital-bed.jpg',
    categoryLabel: o.product?.brand || 'Clinical Grade',
    quantity: o.quantity || 1,
    startDate: o.start_date,
    endDate: o.end_date,
    durationDays: o.duration_days,
    dailyRate: Number(o.daily_rental_price),
    securityDeposit: Number(o.deposit_amount || 0),
    rentalFee: Number(o.rental_fee),
    deliveryFee: Number(o.delivery_fee || 0),
    totalOrderValue: Number(o.total_amount),
    status,
    paymentStatus: 'successful',
    createdAt: o.created_at,
    deliveryAddress: o.delivery_address || {
      recipientName: '',
      phone: '',
      addressLine: '',
      city: '',
      pincode: '',
    },
    deliveryTimeline: timeline,
    returnDetails,
    provider: o.provider || undefined,
    rejectionReason: o.rejection_reason,
    cancellationReason: o.cancellation_reason,
    deliveryStatus: o.delivery_address?.delivery_status,
    feedback: o.delivery_address?.feedback,
  };
}

export const equipmentService = {
  isBackendSupported: true,

  /**
   * Fetch approved patient-facing medical equipment list with filtering & sorting via real API.
   */
  async getCatalogue(filters?: Partial<EquipmentFilterState>): Promise<{
    items: PatientEquipmentItem[];
    isDemonstration: boolean;
  }> {
    try {
      const params: Record<string, any> = {};
      if (filters?.search) params.search = filters.search;
      if (filters?.priceSort === 'low_to_high') params.sort = 'price_asc';
      if (filters?.priceSort === 'high_to_low') params.sort = 'price_desc';
      if ((filters as any)?.page) params.page = (filters as any).page;
      if ((filters as any)?.limit) params.limit = (filters as any).limit;

      const res = await apiClient.get('/rental/patient/products', { params });
      const rawItems = Array.isArray(res.data) ? res.data : res.data?.items || [];
      const items = rawItems.map(mapBackendProductToEquipmentItem);

      return { items, isDemonstration: false };
    } catch (err) {
      console.error('Failed to load patient equipment catalogue:', err);
      return { items: [], isDemonstration: false };
    }
  },

  /**
   * Get equipment details by ID via real API
   */
  async getEquipmentById(id: string): Promise<PatientEquipmentItem | null> {
    try {
      const res = await apiClient.get(`/rental/patient/products/${id}`);
      if (res.data) {
        return mapBackendProductToEquipmentItem(res.data);
      }
    } catch (err) {
      console.error(`Failed to load equipment details for id ${id}:`, err);
    }
    return null;
  },

  /**
   * Get public profile and business info for a rental provider
   */
  async getProviderProfile(providerId: string): Promise<any | null> {
    try {
      const res = await apiClient.get(`/rental/patient/providers/${encodeURIComponent(providerId)}/profile`);
      if (res.data) {
        return res.data;
      }
    } catch (err) {
      console.warn(`Failed to load provider profile for id ${providerId}:`, err);
    }
    return null;
  },

  /**
   * Calculate rental quote strictly enforcing the financial rule:
   * Total Order Value = Equipment Rental Fee + Logistics & Delivery Fee
   * The security deposit is NEVER included in total or rental price.
   */
  calculateQuote(
    item: PatientEquipmentItem,
    startDateStr: string,
    durationDays: number,
    deliveryFee: number = 250
  ): RentalQuote {
    const validDays = Math.max(
      item.minDurationDays,
      Math.min(item.maxDurationDays, durationDays || item.minDurationDays)
    );

    const start = new Date(startDateStr || new Date().toISOString().split('T')[0]);
    const end = new Date(start);
    end.setDate(start.getDate() + validDays);

    const rentalFee = item.dailyRate * validDays;
    const totalOrderValue = rentalFee + deliveryFee;

    return {
      equipmentId: item.id,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      durationDays: validDays,
      dailyRate: item.dailyRate,
      securityDeposit: item.securityDeposit,
      rentalFee,
      deliveryFee,
      totalOrderValue,
      depositNotice: INFORMATIONAL_SECURITY_DEPOSIT_NOTICE,
    };
  },

  /**
   * Get orders for the current patient session via real API
   */
  async getMyOrders(options?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
    demonstrationMode?: boolean;
  }): Promise<{
    orders: PatientRentalOrder[];
    isDemonstration: boolean;
  }> {
    try {
      const params: Record<string, any> = {};
      if (options?.search?.trim()) params.search = options.search.trim();
      if (options?.status && options.status !== 'all') params.status = options.status;
      if (options?.page) params.page = options.page;
      if (options?.limit) params.limit = options.limit;

      const res = await apiClient.get('/rental/patient/orders/mine', { params });
      const rawOrders = Array.isArray(res.data) ? res.data : [];
      const orders = rawOrders.map(mapBackendOrderToPatientOrder);
      return { orders, isDemonstration: false };
    } catch (err) {
      console.error('Failed to fetch patient orders:', err);
      return { orders: [], isDemonstration: false };
    }
  },

  /**
   * Get single order by order reference/id from real API
   */
  async getOrderById(orderId: string): Promise<{
    order: PatientRentalOrder | null;
    isDemonstration: boolean;
  }> {
    try {
      const res = await apiClient.get(`/rental/patient/orders/${encodeURIComponent(orderId)}`);
      if (res.data) {
        return {
          order: mapBackendOrderToPatientOrder(res.data),
          isDemonstration: false,
        };
      }
    } catch (err) {
      console.error(`Failed to fetch order ${orderId}:`, err);
    }
    return { order: null, isDemonstration: false };
  },

  /**
   * Get active rentals via real API
   */
  async getActiveRentals(): Promise<PatientRentalOrder[]> {
    const { orders } = await this.getMyOrders();
    return orders.filter(
      (o) =>
        o.status === 'confirmed' ||
        o.status === 'active' ||
        o.status === 'out_for_delivery' ||
        o.status === 'return_scheduled' ||
        o.status === 'return_requested' ||
        o.status === 'return_inspection_pending'
    );
  },

  /**
   * Submit real rental order to backend with atomic stock verification
   */
  async createOrder(payload: {
    item: PatientEquipmentItem;
    quote: RentalQuote;
    deliveryAddress: PatientRentalOrder['deliveryAddress'];
    paymentMethod: string;
    quantity?: number;
  }): Promise<ServiceOperationResult<PatientRentalOrder>> {
    try {
      const body = {
        product_id: Number(payload.item.id),
        quantity: payload.quantity || 1,
        start_date: payload.quote.startDate,
        end_date: payload.quote.endDate,
        delivery_method: 'doorstep',
        delivery_fee: payload.quote.deliveryFee,
        delivery_address: payload.deliveryAddress,
      };

      const res = await apiClient.post('/rental/patient/orders', body);
      if (res.data) {
        return {
          success: true,
          isSupported: true,
          message: 'Rental order placed successfully.',
          data: mapBackendOrderToPatientOrder(res.data),
        };
      }
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message || err?.message || 'Failed to place rental order.';
      return {
        success: false,
        isSupported: true,
        message: Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage,
      };
    }

    return {
      success: false,
      isSupported: false,
      message: REQUIRED_BACKEND_UNAVAILABLE_MESSAGE,
    };
  },

  /**
   * Cancel an eligible rental order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<ServiceOperationResult> {
    try {
      const res = await apiClient.post(`/rental/patient/orders/${encodeURIComponent(orderId)}/cancel`, {
        reason,
      });
      if (res.data) {
        const msg =
          res.data.cancellation_message ||
          res.data.message ||
          'Your order has been cancelled and your refund will be initiated within 3 working days.';
        return {
          success: true,
          isSupported: true,
          message: msg,
          data: res.data,
        };
      }
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message || err?.message || 'Failed to cancel rental order.';
      return {
        success: false,
        isSupported: true,
        message: Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage,
      };
    }

    return {
      success: false,
      isSupported: false,
      message: REQUIRED_BACKEND_UNAVAILABLE_MESSAGE,
    };
  },

  /**
   * Submit feedback & rating for a returned rental equipment order
   */
  async submitOrderFeedback(
    orderId: string,
    feedback: { rating: number; review?: string; tags?: string[] },
  ): Promise<ServiceOperationResult> {
    try {
      const res = await apiClient.post(
        `/rental/patient/orders/${encodeURIComponent(orderId)}/feedback`,
        feedback,
      );
      return {
        success: true,
        isSupported: true,
        message: res.data?.message || 'Thank you! Your feedback has been submitted successfully.',
        data: res.data,
      };
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message || err?.message || 'Failed to submit feedback.';
      return {
        success: false,
        isSupported: true,
        message: Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage,
      };
    }
  },

  /**
   * Attempt payment submission or retry (backward compatibility placeholder)
   */
  async processPayment(payload: {
    orderId: string;
    paymentMethod: string;
    amount: number;
  }): Promise<ServiceOperationResult<{ paymentStatus: RentalPaymentStatus }>> {
    return {
      success: false,
      isSupported: false,
      message: REQUIRED_BACKEND_UNAVAILABLE_MESSAGE,
    };
  },

  /**
   * Attempt return scheduling request via real backend API
   */
  async requestReturn(payload: {
    orderId: string;
    requestedDate: string;
    pickupWindow?: string;
    pickupAddress: string;
    conditionNotes?: string;
  }): Promise<ServiceOperationResult<PatientRentalOrder>> {
    try {
      const body = {
        requested_date: payload.requestedDate,
        pickup_address: payload.pickupAddress,
        pickup_window: payload.pickupWindow || '10:00 AM – 01:00 PM',
        condition_notes: payload.conditionNotes,
      };

      const res = await apiClient.post(
        `/rental/patient/orders/${encodeURIComponent(payload.orderId)}/return`,
        body,
      );

      if (res.data) {
        return {
          success: true,
          isSupported: true,
          message: 'Return pickup scheduled successfully.',
          data: mapBackendOrderToPatientOrder(res.data),
        };
      }
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message || err?.message || 'Failed to schedule return pickup.';
      return {
        success: false,
        isSupported: true,
        message: Array.isArray(backendMessage) ? backendMessage.join(', ') : backendMessage,
      };
    }

    return {
      success: false,
      isSupported: false,
      message: REQUIRED_BACKEND_UNAVAILABLE_MESSAGE,
    };
  },
};
