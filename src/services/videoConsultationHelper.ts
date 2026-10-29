import { ENDPOINTS } from './endpoints';
import apiClient from './index';

export interface VideoRoomStatus {
  appointment_id: string;
  booking_id: string;
  booking_number: string;
  room_name: string | null;
  video_started_at: string | null;
  video_ended_at: string | null;
  can_join: boolean;
  join_url: string | null;
  status: string;
}

export const getVideoStatusApi = async (appointmentId: string): Promise<VideoRoomStatus | null> => {
  try {
    const response = await apiClient.get<VideoRoomStatus>(ENDPOINTS.VIDEO.STATUS(appointmentId));
    return response.data;
  } catch (error) {
    console.warn(`[getVideoStatusApi] Failed for appointment ${appointmentId}:`, error);
    return null;
  }
};

/**
 * Plays a pleasant medical app chime through the patient's speaker to verify audio output.
 */
export const playSpeakerTestSound = async (): Promise<boolean> => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return false;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.35); // G5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(523.25, now);
    osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.35); // C6

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.65);
    osc2.stop(now + 0.65);

    return true;
  } catch (e) {
    console.warn('Audio test playback failed:', e);
    return false;
  }
};
