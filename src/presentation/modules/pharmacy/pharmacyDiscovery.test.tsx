import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PharmacyCard } from './OrderStart';
import { pharmacyDistance, pharmacyHours, verifiedLicense } from './pharmacyDiscovery';
import type { ProviderItem } from '../../../services/types';
const missing = { id: '1', name: 'Local Pharmacy', serviceId: 'pharmacy' } as ProviderItem;
const complete = { ...missing, address: '12 Main Road, Hyderabad, 500081', licenseStatus: 'Verified', storePin: { lat: 17.44, lng: 78.39 }, rating: { average: 4.6, count: 21 }, businessHours: [{ day: 'Monday', open_time: '09:00', close_time: '21:00', is_closed: false }] };
describe('pharmacy discovery records', () => {
  it('renders complete records using actual aggregates and verification', () => {
    const html = renderToStaticMarkup(<PharmacyCard p={complete} onChoose={() => {}} />);
    for (const text of ['Licensed', '4.6', '21', complete.address, 'Order here', 'Pharmacy details', 'Monday']) expect(html).toContain(text);
    expect(html).not.toContain('Open now');
  });
  it('keeps missing information honest and compact', () => {
    const html = renderToStaticMarkup(<PharmacyCard p={missing} />);
    for (const text of ['Address not provided', 'Not rated yet', 'Hours not provided', 'Details not provided']) expect(html).toContain(text);
    expect(html).not.toContain('Licensed');
    expect(html).not.toContain('km away');
    expect(verifiedLicense({ ...missing, licenseStatus: 'Pending' })).toBe(false);
    expect(pharmacyHours({ ...missing, businessHours: [{ day: 'Monday', open_time: 'bad', close_time: null, is_closed: false }] })).toEqual([]);
  });
  it('only calculates distances with valid selected and pharmacy coordinates', () => {
    expect(pharmacyDistance(complete, null)).toBeNull();
    expect(pharmacyDistance(missing, { lat: 17, lng: 78 })).toBeNull();
    expect(pharmacyDistance(complete, { lat: 91, lng: 78 })).toBeNull();
    expect(pharmacyDistance(complete, complete.storePin)).toBe(0);
    const metres = pharmacyDistance(complete, { lat: 17.45, lng: 78.39 });
    expect(metres).toBeGreaterThan(1110); expect(metres).toBeLessThan(1113);
  });
  it('disables paused pharmacy ordering', () => {
    const html = renderToStaticMarkup(<PharmacyCard p={{ ...missing, pause: { paused: true, indefinite: true, until: null, reason: null } }} onChoose={() => {}} />);
    expect(html).toContain('disabled'); expect(html).toContain('Not taking orders right now');
  });
});
