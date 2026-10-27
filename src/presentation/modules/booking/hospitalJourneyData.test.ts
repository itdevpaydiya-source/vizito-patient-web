import {describe,it,expect} from 'vitest';
import {verifiedNabh,bookableSlots} from './hospitalJourneyData';
import type {HospitalFacts} from '../../../services/types';
import type {AvailableSlot} from '../../../services/bookingHelper';
describe('hospital facts and available slots',()=>{
 it('requires verified NABH, not a declared or expired certificate',()=>{
  for(const verification_status of ['DECLARED','EXPIRED','INCOMPLETE'] as const)expect(verifiedNabh({accreditations:[{name:'NABH',verification_status}]} as HospitalFacts)).toBe(false);
  expect(verifiedNabh({accreditations:[{name:'NABH',verification_status:'VERIFIED'}]} as HospitalFacts)).toBe(true);
  expect(verifiedNabh({accreditations:[{name:'Other body',verification_status:'VERIFIED'}]} as HospitalFacts)).toBe(false);
  expect(verifiedNabh(null)).toBe(false);
 });
 it('excludes booked and expired slots using India time, regardless of browser timezone',()=>{
  const slots=[{time_slot_id:1,slot_date:'2000-01-01',start_time:'10:00:00'},{time_slot_id:2,slot_date:'2099-01-01',start_time:'10:00:00',is_booked:true},{time_slot_id:3,slot_date:'2099-01-01',start_time:'10:00:00',is_booked:false}] as AvailableSlot[];
  expect(bookableSlots(slots,'2099-01-01').map(s=>s.time_slot_id)).toEqual([3]);
 });
});
