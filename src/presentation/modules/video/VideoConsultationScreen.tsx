import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getDashboardApi } from '../../../services/dashboardHelper';
import { dashboardBookings } from '../bookings/bookingOverviewData';
import type { DoctorBooking } from '../bookings/doctorAppointmentsData';
import { getVideoStatusApi, type VideoRoomStatus } from '../../../services/videoConsultationHelper';
import VideoWaitingRoom from './VideoWaitingRoom';
import VideoInConsultation from './VideoInConsultation';

export const VideoConsultationScreen: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isCallRoute = location.pathname.endsWith('/call');

  const [booking, setBooking] = useState<DoctorBooking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [videoStatus, setVideoStatus] = useState<VideoRoomStatus | null>(null);
  const [inCall, setInCall] = useState<boolean>(isCallRoute);
  const [attachedReports, setAttachedReports] = useState<{ id: string; name: string; size?: string }[]>([]);

  const pollIntervalRef = useRef<number | null>(null);

  // Load the booking data
  const loadBooking = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboard = await getDashboardApi();
      const allBookings = dashboardBookings(dashboard) as DoctorBooking[];
      const found = allBookings.find(
        (b) =>
          b.id === bookingId ||
          b.bookingNumber === bookingId ||
          (b as any).appointment_id === bookingId
      );

      // Never stand in a made-up booking: a missing booking is an honest error, not a demo doctor.
      if (found) setBooking(found);
      else setError('We could not find this video consultation. Open it again from My Bookings.');
    } catch {
      setError('The video consultation could not be loaded. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  // Poll video status from backend
  useEffect(() => {
    if (!bookingId) return;

    const checkStatus = async () => {
      const res = await getVideoStatusApi(bookingId);
      if (res) {
        setVideoStatus(res);
      }
    };

    checkStatus();
    const interval = window.setInterval(checkStatus, 4000);
    pollIntervalRef.current = interval;

    return () => {
      window.clearInterval(interval);
    };
  }, [bookingId]);

  // Handle Join Action
  const handleJoinCall = () => {
    setInCall(true);
    navigate(`/video-consultation/${encodeURIComponent(bookingId || '')}/call`, { replace: true });
  };

  // Handle End Call Action
  const handleEndCall = () => {
    setInCall(false);
    navigate(`/my-consultations?ended=video&id=${encodeURIComponent(bookingId || '')}`, { replace: true });
  };

  const handleAddReport = (report: { id: string; name: string; size?: string }) => {
    setAttachedReports((prev) => [...prev, report]);
  };

  const handleRemoveReport = (id: string) => {
    setAttachedReports((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading && !booking) {
    return (
      <div className="video-consult-page" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontSize: '15px' }}>Loading consultation room…</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="video-consult-page" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ color: '#ef4444', fontSize: '15px' }}>{error}</p>
        <button
          type="button"
          onClick={loadBooking}
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: '#ea580c',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!booking) return null;

  // Determine room name
  // Only the doctor's real room: an invented name would leave the patient alone in another call.
  const effectiveRoomName = videoStatus?.room_name || booking.visit?.video?.room_name || '';

  // Doctor has admitted / call is ready
  const effectiveCanJoin = Boolean(
    videoStatus?.can_join ||
    booking.visit?.video?.can_join ||
    videoStatus?.video_started_at
  ) && Boolean(effectiveRoomName);

  return inCall && effectiveRoomName ? (
    <VideoInConsultation
      booking={booking}
      roomName={effectiveRoomName}
      onEndCall={handleEndCall}
      attachedReports={attachedReports}
      onAddReport={handleAddReport}
      onRemoveReport={handleRemoveReport}
    />
  ) : (
    <VideoWaitingRoom
      booking={booking}
      canJoin={effectiveCanJoin}
      onJoin={handleJoinCall}
      attachedReports={attachedReports}
      onAddReport={handleAddReport}
      onRemoveReport={handleRemoveReport}
    />
  );
};

export default VideoConsultationScreen;
