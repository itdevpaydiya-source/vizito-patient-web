import React, { useState } from 'react';
import { X, Calendar, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { hcRescheduleShiftApi, type HcShift } from '../../../../services/homecareHelper';

interface RescheduleShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  shift: HcShift | null;
  shiftRate?: number;
  onSuccess: (updatedShift: HcShift) => void;
}

export default function RescheduleShiftModal({
  isOpen,
  onClose,
  orderId,
  shift,
  shiftRate = 1200,
  onSuccess,
}: RescheduleShiftModalProps) {
  const [newDate, setNewDate] = useState<string>('');
  const [newSlot, setNewSlot] = useState<string>('MORNING');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !shift) return null;

  // Calculate cutoff: if current time to shift start is < 12 hours
  const isLateReschedule = (() => {
    try {
      const shiftStart = new Date(`${shift.date}T${shift.start_time || '08:00'}:00`);
      const diffMs = shiftStart.getTime() - Date.now();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours < 12;
    } catch {
      return false;
    }
  })();

  const lateFee = Math.min(Math.round(shiftRate * 0.5), 300);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newDate) {
      setError('Please choose a new date.');
      return;
    }

    setLoading(true);
    try {
      const updated = await hcRescheduleShiftApi(orderId, shift.id, {
        new_date: newDate,
        new_slot: newSlot,
        reason: reason.trim() || undefined,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(' ') : msg || 'Unable to reschedule shift.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Shift Reschedule</span>
          </div>
          <h2 className="text-xl font-black">Reschedule Shift</h2>
          <p className="text-slate-300 text-xs mt-1">
            Current: <b>{shift.date}</b>{shift.start_time ? ` (${shift.start_time})` : ''} · {shift.staff_name || 'Caregiver to be assigned'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Policy Cutoff Notice */}
          <div className={`p-3.5 rounded-2xl border text-xs ${
            isLateReschedule
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-center gap-2 font-black">
              {isLateReschedule ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Late Reschedule Notice (&lt; 12 Hours)</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Free Reschedule Eligible (&gt; 12 Hours)</span>
                </>
              )}
            </div>
            <p className="text-[11px] mt-1 leading-relaxed">
              {isLateReschedule
                ? `Rescheduling less than 12 hours before start incurs a late fee of ₹${lateFee} (50% of 1 shift, capped at ₹300) to compensate the assigned caregiver.`
                : 'Rescheduling more than 12 hours in advance is completely free of charge.'}
            </p>
          </div>

          {/* New Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select New Date <span className="text-rose-600">*</span>
            </label>
            <input
              type="date"
              value={newDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 font-medium"
              required
            />
          </div>

          {/* New Shift Slot */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Shift Slot
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'MORNING', label: 'Morning', hours: '08:00 - 20:00' },
                { key: 'NIGHT', label: 'Night', hours: '20:00 - 08:00' },
                { key: '24HR', label: '24 Hours', hours: 'Full Day' },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setNewSlot(s.key)}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    newSlot === s.key
                      ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold">{s.label}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{s.hours}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Doctor appointment scheduled on original date"
              className="w-full rounded-xl border border-slate-200 p-2 text-xs text-slate-800 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              data-testid="confirm-reschedule-btn"
              className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition"
            >
              {loading ? 'Rescheduling...' : isLateReschedule ? `Reschedule (+₹${lateFee} Fee)` : 'Reschedule Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
