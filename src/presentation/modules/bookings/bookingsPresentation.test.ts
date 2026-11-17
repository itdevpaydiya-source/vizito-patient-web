import { describe, expect, it } from 'vitest';
import type { DashboardBooking } from '../../../services/dashboardHelper';
import {
  commerceStatus,
  statusOf,
  statusText,
  type Booking,
} from './bookingsPresentation';

const baseDashboardBooking = (
  overrides: Partial<DashboardBooking> = {},
): DashboardBooking => ({
  id: 'b-1',
  bookingReference: 'BK-20261111-000001',
  serviceType: 'DOCTOR',
  status: 'PENDING',
  appointmentDate: '2026-11-11',
  timeSlot: '17:00',
  endTime: '17:15',
  provider: null,
  business: null,
  ...overrides,
});

describe('bookingsPresentation (TC-44 active status mapping)', () => {
  it('maps in-progress and checked-in consultation statuses to active even when outer booking status is PENDING', () => {
    expect(statusOf(baseDashboardBooking({ appointmentStatus: 'IN_PROGRESS', status: 'PENDING' }))).toBe('active');
    expect(statusOf(baseDashboardBooking({ appointmentStatus: 'IN_CONSULTATION', status: 'CONFIRMED' }))).toBe('active');
    expect(statusOf(baseDashboardBooking({ appointmentStatus: 'CHECKED_IN', status: 'PENDING' }))).toBe('active');
    expect(statusOf(baseDashboardBooking({ appointmentStatus: 'ARRIVED', status: 'PENDING' }))).toBe('active');
    expect(statusOf(baseDashboardBooking({ status: 'PENDING' }), true)).toBe('active');
  });

  it('keeps scheduled confirmed/pending bookings in upcoming and completed/cancelled in their sections', () => {
    expect(statusOf(baseDashboardBooking({ status: 'CONFIRMED', appointmentStatus: 'BOOKED' }))).toBe('upcoming');
    expect(statusOf(baseDashboardBooking({ appointmentStatus: 'COMPLETED', status: 'CONFIRMED' }))).toBe('completed');
    expect(statusOf(baseDashboardBooking({ status: 'CANCELLED' }))).toBe('cancelled');
  });

  it('maps active commerce statuses and human-readable status labels', () => {
    expect(commerceStatus('PROCESSING')).toBe('active');
    expect(commerceStatus('OUT_FOR_DELIVERY')).toBe('active');
    expect(commerceStatus('COMPLETED')).toBe('completed');
    expect(commerceStatus('CANCELLED')).toBe('cancelled');
    expect(statusText({ ...baseDashboardBooking({ appointmentStatus: 'IN_PROGRESS' }), section: 'active' } as Booking)).toBe('In consultation');
    expect(statusText({ ...baseDashboardBooking({ appointmentStatus: 'CHECKED_IN' }), section: 'active' } as Booking)).toBe('Checked in');
  });
});

