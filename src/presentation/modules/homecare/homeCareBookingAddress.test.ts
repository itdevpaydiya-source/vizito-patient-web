import { describe, it, expect } from 'vitest';
import type { ResolvedAddress } from '../../components/location/HomePinField';

describe('Home Care address and pin resolution', () => {
  it('correctly maps a full resolved address from map pin lookup', () => {
    const resolved: ResolvedAddress = {
      line: 'Flat 402, Lotus Residency',
      area: 'Madhapur',
      city: 'Hyderabad',
      pincode: '500081',
      landmark: 'Near Durgam Cheruvu Metro',
      pin: { lat: 17.4399, lng: 78.3809 },
      label: 'Home · Flat 402, Lotus Residency',
    };

    expect(resolved.line).toBe('Flat 402, Lotus Residency');
    expect(resolved.area).toBe('Madhapur');
    expect(resolved.city).toBe('Hyderabad');
    expect(resolved.pincode).toBe('500081');
    expect(resolved.pin).toEqual({ lat: 17.4399, lng: 78.3809 });
  });

  it('handles partial address resolution gracefully', () => {
    const partial: ResolvedAddress = {
      city: 'Hyderabad',
      pincode: '500034',
      pin: { lat: 17.424, lng: 78.438 },
    };

    const currentForm = {
      line: '',
      area: '',
      city: '',
      landmark: '',
    };

    const updated = {
      line: partial.line || currentForm.line,
      area: partial.area || currentForm.area,
      city: partial.city || currentForm.city,
      landmark: partial.landmark || currentForm.landmark,
    };

    expect(updated.city).toBe('Hyderabad');
    expect(updated.line).toBe('');
    expect(partial.pincode).toBe('500034');
  });

  it('generates 7 consecutive days starting from Today', () => {
    const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const getDays = () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() + i * 86400000);
      return {
        iso: iso(d),
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }),
      };
    });

    const days = getDays();
    expect(days).toHaveLength(7);
    expect(days[0].label).toBe('Today');
    expect(days[1].label).toBe('Tomorrow');
    expect(days[0].iso).toBe(iso(new Date()));
  });
});

