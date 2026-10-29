import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, FileText, MessageSquare, PhoneOff,
  MoreVertical, Calendar, User, Upload, Wifi, CheckCircle2, ShieldCheck,
  Paperclip, X
} from 'lucide-react';
import { doctorName, type DoctorBooking } from '../bookings/doctorAppointmentsData';
import './VideoConsultation.css';

interface VideoInConsultationProps {
  booking: DoctorBooking;
  roomName: string;
  onEndCall: () => void;
  attachedReports: { id: string; name: string; size?: string }[];
  onAddReport: (report: { id: string; name: string; size?: string }) => void;
  onRemoveReport: (id: string) => void;
}

export const VideoInConsultation: React.FC<VideoInConsultationProps> = ({
  booking: b,
  roomName,
  onEndCall,
  attachedReports,
  onAddReport,
  onRemoveReport,
}) => {
  const d = b.provider?.doctor;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tabs in right panel
  const [activeTab, setActiveTab] = useState<'details' | 'notes'>('details');
  const [notesText, setNotesText] = useState<string>('');

  // Call timer (starts counting from call start)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // In-call media toggles
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [showChatNotice, setShowChatNotice] = useState<boolean>(false);

  // PiP patient camera stream
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const pipStreamRef = useRef<MediaStream | null>(null);

  // Confirm end call modal
  const [confirmEndOpen, setConfirmEndOpen] = useState<boolean>(false);

  // Start call timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format elapsed time (hh:mm:ss or mm:ss)
  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  // Setup PiP video preview
  useEffect(() => {
    let active = true;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        pipStreamRef.current = stream;
        if (pipVideoRef.current) {
          pipVideoRef.current.srcObject = stream;
        }
      })
      .catch((e) => {
        console.warn('PiP camera stream error:', e);
      });

    return () => {
      active = false;
      if (pipStreamRef.current) {
        pipStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Stop video track in PiP when video toggled
  useEffect(() => {
    if (pipStreamRef.current) {
      pipStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !isVideoOff;
      });
    }
  }, [isVideoOff]);

  const patientName = b.patientName || 'Kavya Reddy';
  const docDisplayName = doctorName(b) || 'Dr. Sravani Reddy';
  const docRating = d?.rating != null && Number(d.review_count) > 0 ? `${d.rating.toFixed(1)} (${d.review_count} reviews)` : '4.6 (120 reviews)';

  // Jitsi URL with config params
  const jitsiUrl = `https://meet.jit.si/${encodeURIComponent(roomName)}#userInfo.displayName=${encodeURIComponent(patientName)}&config.prejoinPageEnabled=false&config.disableDeepLinking=true&config.toolbarButtons=["microphone","camera","chat","desktop","hangup"]`;

  return (
    <div className="video-consult-page">
      {/* Breadcrumb */}
      <nav className="video-breadcrumb" aria-label="Breadcrumb">
        <Link to="/dashboard">Home</Link>
        <span className="sep">›</span>
        <Link to="/find-doctors">Doctors</Link>
        <span className="sep">›</span>
        <span>Video consultation</span>
        <span className="sep">›</span>
        <span>{docDisplayName}</span>
        <span className="sep">›</span>
        <span className="current">In consultation</span>
      </nav>

      {/* Main 2-column In-Call Layout */}
      <div className="video-in-call-layout">
        {/* Left: Video Stage Area */}
        <div className="video-stage-container">
          {/* Top Overlays */}
          <div className="video-overlay-top">
            {/* Top Left: Doctor Info Badge */}
            <div className="video-overlay-doctor-badge">
              <img
                src={d?.photo_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150'}
                alt={docDisplayName}
              />
              <div>
                <div className="name">{docDisplayName}</div>
                <div className="sub">11:32 | 15 min consultation</div>
              </div>
            </div>

            {/* Top Right: Connection & Call Timer */}
            <div className="video-overlay-stats">
              <div className="video-connection-pill">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Good connection</span>
              </div>
              <div className="video-timer-pill">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>
            </div>
          </div>

          {/* Jitsi Meet IFrame */}
          <iframe
            title="Doctor Consultation Video Stream"
            src={jitsiUrl}
            allow="camera; microphone; display-capture; autoplay; clipboard-write"
            className="video-iframe-embed"
          />

          {/* Patient Selfie Picture-in-Picture */}
          <div className="video-pip-preview">
            {!isVideoOff ? (
              <video ref={pipVideoRef} autoPlay playsInline muted />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-500 text-xs">
                Camera off
              </div>
            )}
            <div className="video-pip-label">
              <span>{patientName}</span>
              <MoreVertical className="w-3 h-3 text-slate-300" />
            </div>
          </div>

          {/* Bottom Floating Controls Toolbar */}
          <div className="video-bottom-controls-bar">
            {/* Mute Button */}
            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              className={`video-ctrl-btn ${isMuted ? 'off' : ''}`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4" />}
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            {/* Camera Button */}
            <button
              type="button"
              onClick={() => setIsVideoOff((v) => !v)}
              className={`video-ctrl-btn ${isVideoOff ? 'off' : ''}`}
              title={isVideoOff ? 'Start camera' : 'Stop camera'}
            >
              {isVideoOff ? <VideoOff className="w-4 h-4 text-rose-400" /> : <Video className="w-4 h-4" />}
              <span>{isVideoOff ? 'Start video' : 'Stop video'}</span>
            </button>

            {/* Share Report Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="video-ctrl-btn"
              title="Share report with doctor"
            >
              <FileText className="w-4 h-4" />
              <span>Share report</span>
            </button>

            {/* Chat Button */}
            <button
              type="button"
              onClick={() => setShowChatNotice((c) => !c)}
              className="video-ctrl-btn"
              title="Toggle in-call chat"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat</span>
            </button>

            {/* End Call Button */}
            <button
              type="button"
              onClick={() => setConfirmEndOpen(true)}
              className="video-ctrl-btn end"
              title="End consultation call"
            >
              <PhoneOff className="w-4 h-4 mr-1 inline" />
              <span>End call</span>
            </button>
          </div>
        </div>

        {/* Right: Side Panel with Tabs */}
        <aside className="video-sidebar-panel">
          <div className="video-sidebar-tabs">
            <button
              type="button"
              className={`video-sidebar-tab ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Appointment details
            </button>
            <button
              type="button"
              className={`video-sidebar-tab ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              Shared notes
            </button>
          </div>

          <div className="video-sidebar-content">
            {activeTab === 'details' ? (
              <>
                {/* Doctor Mini Card */}
                <div className="video-doctor-profile" style={{ marginBottom: '10px', paddingBottom: '12px' }}>
                  <img
                    src={d?.photo_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200'}
                    alt={docDisplayName}
                    className="video-doctor-avatar"
                    style={{ width: '60px', height: '60px' }}
                  />
                  <div className="video-doctor-meta">
                    <h2 style={{ fontSize: '15px' }}>{docDisplayName}</h2>
                    <p className="quals">{d?.qualification || 'MBBS, MD (General Medicine)'}</p>
                    <p className="spec">{d?.speciality || 'General Physician'}</p>
                    <span className="video-rating-pill">
                      ★ {docRating}
                    </span>
                  </div>
                </div>

                {/* Details List */}
                <div className="video-details-list">
                  <div className="video-detail-item">
                    <Calendar className="icon" />
                    <div>
                      <div className="label">Scheduled time</div>
                      <div className="value">
                        {b.appointmentDate ? `${b.appointmentDate} | ${b.timeSlot || '11:30 AM – 11:45 AM'}` : 'Today, 28 Oct 2026 | 11:30 AM – 11:45 AM'}
                      </div>
                    </div>
                  </div>

                  <div className="video-detail-item">
                    <User className="icon" />
                    <div>
                      <div className="label">Patient</div>
                      <div className="value">{patientName} (Self)</div>
                    </div>
                  </div>

                  <div className="video-detail-item">
                    <Video className="icon" />
                    <div>
                      <div className="label">Consultation type</div>
                      <div className="value">Video consultation (₹{b.totalAmount || 500})</div>
                    </div>
                  </div>
                </div>

                {/* Share Reports Callout */}
                <div className="video-callout-share-report">
                  <div className="text-row">
                    <div className="icon-box">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="title">You can share reports during the call</div>
                      <p className="desc">Click Share report to show your reports to the doctor.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="video-btn-outline orange"
                    style={{ width: '100%', marginTop: '4px' }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Share report
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        onAddReport({
                          id: `live-report-${Date.now()}-${i}`,
                          name: file.name,
                          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                        });
                      }
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  />
                </div>

                {/* Attached Reports List */}
                {attachedReports.length > 0 && (
                  <div className="video-attached-reports-list">
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Shared with doctor ({attachedReports.length})
                    </div>
                    {attachedReports.map((item) => (
                      <div key={item.id} className="video-attached-item">
                        <span>📄 {item.name}</span>
                        <button
                          type="button"
                          onClick={() => onRemoveReport(item.id)}
                          title="Remove report"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Tab 2: Shared Notes */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                  Take notes during your consultation. You can review them after the call.
                </p>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="e.g. Doctor recommended taking medicine after meals, return for follow-up in 10 days..."
                  style={{
                    flex: 1,
                    minHeight: '220px',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    fontFamily: 'inherit',
                    resize: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => alert('Notes saved locally.')}
                  className="video-btn-outline blue"
                  style={{ width: '100%' }}
                >
                  Save notes
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Confirm End Call Modal */}
      {confirmEndOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '420px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
              Leave consultation?
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Are you sure you want to end this video call with {docDisplayName}? You will return to your consultations dashboard.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setConfirmEndOpen(false)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Stay in call
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmEndOpen(false);
                  onEndCall();
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#e11d48',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Yes, end call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoInConsultation;
