import { describe, expect, it } from 'vitest';
import { TRIP_STEPS, trackingTitle, tripStepIndex } from './TrackingDetails';

describe('urgent request trip progress', () => {
  it('maps each live trip status to its step', () => {
    expect(['ACCEPTED', 'ASSIGNED', 'EN_ROUTE', 'AT_PICKUP', 'ON_BOARD', 'COMPLETED'].map(tripStepIndex)).toEqual([0, 0, 1, 2, 3, 4]);
    expect(TRIP_STEPS[tripStepIndex('AT_PICKUP')]).toBe('At pickup');
  });

  it('keeps searching and cancelled trips off the progress path', () => {
    expect(['REQUESTED', 'CANCELLED', 'DECLINED', 'EXPIRED', 'UNKNOWN'].map(tripStepIndex)).toEqual([-1, -1, -1, -1, -1]);
  });

  it('uses the track page headings for every step', () => {
    expect(['ACCEPTED', 'ASSIGNED', 'EN_ROUTE', 'AT_PICKUP', 'ON_BOARD', 'COMPLETED'].map(s => trackingTitle(s, s)))
      .toEqual(['Ambulance accepted', 'Your ambulance is assigned', 'Ambulance on the way', 'Ambulance at pickup', 'Patient onboard', 'Trip completed']);
  });
});
