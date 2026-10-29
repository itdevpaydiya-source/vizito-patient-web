import { Link } from 'react-router-dom';
import { Star, Video, PlayCircle, Users } from 'lucide-react';
import { appointmentTimestamp, type DoctorBooking } from './doctorAppointmentsData';

export function DoctorRating({ booking: b }: { booking: DoctorBooking }) {
  const d = b.provider?.doctor;
  return d?.rating != null && Number(d.review_count) > 0 ? (
    <span className="doctor-rating">
      <Star aria-hidden="true" />
      {d.rating.toFixed(1)} <span>({d.review_count} reviews)</span>
    </span>
  ) : null;
}

export function DoctorVideoInfo({ booking: b }: { booking: DoctorBooking }) {
  const v = b.visit?.video;
  if (!v) return null;
  const isCompleted = String(b.appointmentStatus || b.status).toUpperCase() === 'COMPLETED' || Boolean(v.video_ended_at);
  const isCancelled = String(b.appointmentStatus || b.status).toUpperCase() === 'CANCELLED';

  return (
    <div className="doctor-call-info" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <Video style={{ color: '#0d9488', width: 20, height: 20, flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#134e4a' }}>{v.message}</p>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475569' }}>
            <strong>Expected call: </strong>
            {v.call_expected_from ? appointmentTimestamp(v.call_expected_from) : 'Not provided'}
            {v.call_expected_until && ` – ${appointmentTimestamp(v.call_expected_until)}`}
          </p>
          {v.mode_used && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Consultation mode: {v.mode_used}</p>}
        </div>
      </div>

      {!isCompleted && !isCancelled && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          {v.can_join ? (
            <Link
              to={`/video-consultation/${encodeURIComponent(b.id)}/call`}
              className="booking-button"
              style={{
                background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              <PlayCircle style={{ width: 16, height: 16 }} />
              Join video consultation
            </Link>
          ) : (
            <Link
              to={`/video-consultation/${encodeURIComponent(b.id)}`}
              className="booking-button"
              style={{
                background: '#f0fdfa',
                color: '#0f766e',
                border: '1px solid #99f6e4',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <Users style={{ width: 16, height: 16 }} />
              Enter waiting room &amp; device check
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
