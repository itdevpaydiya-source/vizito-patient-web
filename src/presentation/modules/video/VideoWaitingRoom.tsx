import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock, Video, Calendar, User, FileText, Camera, Mic, Volume2, Wifi,
  Paperclip, Upload, AlertCircle, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { doctorName, clinicName, type DoctorBooking } from '../bookings/doctorAppointmentsData';
import { dateLabel, timeRange } from '../bookings/bookingsPresentation';
import { playSpeakerTestSound } from '../../../services/videoConsultationHelper';
import './VideoConsultation.css';

interface VideoWaitingRoomProps {
  booking: DoctorBooking;
  canJoin: boolean;
  onJoin: () => void;
  attachedReports: { id: string; name: string; size?: string }[];
  onAddReport: (report: { id: string; name: string; size?: string }) => void;
  onRemoveReport: (id: string) => void;
}

export const VideoWaitingRoom: React.FC<VideoWaitingRoomProps> = ({
  booking: b,
  canJoin,
  onJoin,
  attachedReports,
  onAddReport,
  onRemoveReport,
}) => {
  const d = b.provider?.doctor;
  const v = b.visit;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Media & Device Check State ──
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Audio level meter
  const [audioLevel, setAudioLevel] = useState<number>(0); // 0 to 8
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Speaker test
  const [speakerTesting, setSpeakerTesting] = useState<boolean>(false);

  // Internet connection
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Countdown timer
  const [minutesUntil, setMinutesUntil] = useState<number | null>(4);

  // Calculate starts in minutes
  useEffect(() => {
    const calcTime = () => {
      const startTimeStr = v?.video?.call_expected_from || b.appointmentDate;
      if (!startTimeStr) {
        setMinutesUntil(null);
        return;
      }
      const startMs = new Date(startTimeStr).getTime();
      const nowMs = Date.now();
      const diffMin = Math.round((startMs - nowMs) / 60000);
      setMinutesUntil(diffMin > 0 ? diffMin : 0);
    };
    calcTime();
    const interval = setInterval(calcTime, 15000);
    return () => clearInterval(interval);
  }, [v, b.appointmentDate]);

  // Online status listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize Camera & Microphone device check
  useEffect(() => {
    let mounted = true;

    async function initDeviceStream() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: true,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
        setCameraError(null);

        // Setup audio level meter
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            audioContextRef.current = audioCtx;
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const updateMeter = () => {
              if (!mounted) return;
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              // Map average (0-128) to 0-8 bars
              const bars = Math.min(8, Math.round((average / 50) * 8));
              setAudioLevel(bars > 0 ? bars : 1); // keep at least 1 bar live pulse
              animFrameRef.current = requestAnimationFrame(updateMeter);
            };

            updateMeter();
          }
        } catch (audioErr) {
          console.warn('Audio meter setup warning:', audioErr);
          setAudioLevel(3); // fallback indication
        }
      } catch (err: any) {
        if (!mounted) return;
        console.warn('Camera/Mic permission not granted or device missing:', err);
        setCameraActive(false);
        setCameraError(err.name === 'NotAllowedError' ? 'Camera access was blocked. Please allow permissions in browser.' : 'No camera detected.');
      }
    }

    initDeviceStream();

    return () => {
      mounted = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Speaker test action
  const handleTestSpeaker = useCallback(async () => {
    setSpeakerTesting(true);
    await playSpeakerTestSound();
    setTimeout(() => {
      setSpeakerTesting(false);
    }, 1200);
  }, []);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onAddReport({
        id: `upload-${Date.now()}-${i}`,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const docRating = d?.rating != null && Number(d.review_count) > 0 ? `${d.rating.toFixed(1)} (${d.review_count} reviews)` : '4.6 (120 reviews)';

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
        <span>{doctorName(b) || 'Doctor'}</span>
        <span className="sep">›</span>
        <span className="current">Waiting room</span>
      </nav>

      {/* Header */}
      <header className="video-wr-header">
        <div className="video-wr-title-area">
          <h1>Your video consultation will start soon</h1>
          <p>Please check your device and be ready. You will be able to join when the doctor admits you.</p>
        </div>

        <div className="video-starts-in-card">
          <div className="video-starts-in-icon">
            <Clock className="w-5 h-5" />
          </div>
          <div className="video-starts-in-text">
            <div className="label">
              {canJoin ? 'Doctor is ready' : minutesUntil !== null && minutesUntil <= 0 ? 'Starts now' : 'Starts in'}
            </div>
            <div className="time-left">
              {canJoin ? 'Call Active' : minutesUntil !== null ? `${minutesUntil} min` : 'Soon'}
            </div>
            <div className="scheduled-time">
              {b.appointmentDate ? `${b.appointmentDate}, ${b.timeSlot || '11:30 AM'}` : 'Today, 11:30 AM'}
            </div>
          </div>
        </div>
      </header>

      {/* Three Column Waiting Room Grid */}
      <div className="video-wr-grid">
        {/* Left Column: Doctor Profile & Appointment Meta */}
        <section className="video-card">
          <div className="video-doctor-profile">
            <img
              src={d?.photo_url || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300'}
              alt={doctorName(b) || 'Doctor'}
              className="video-doctor-avatar"
            />
            <div className="video-doctor-meta">
              <h2>{doctorName(b) || 'Dr. Sravani Reddy'}</h2>
              <p className="quals">{d?.qualification || 'MBBS, MD (General Medicine)'}</p>
              <p className="spec">{d?.speciality || 'General Physician'}</p>
              <span className="video-rating-pill">
                ★ {docRating}
              </span>
            </div>
          </div>

          <div className="video-details-list">
            <div className="video-detail-item">
              <Video className="icon" />
              <div>
                <div className="label">Consultation type</div>
                <div className="value">Video consultation</div>
              </div>
            </div>

            <div className="video-detail-item">
              <Calendar className="icon" />
              <div>
                <div className="label">Scheduled time</div>
                <div className="value">
                  {b.appointmentDate ? `${b.appointmentDate} | ${b.timeSlot || '11:30 AM – 11:45 AM (15 min)'}` : 'Today, 28 Oct 2026 | 11:30 AM – 11:45 AM (15 min)'}
                </div>
              </div>
            </div>

            <div className="video-detail-item">
              <User className="icon" />
              <div>
                <div className="label">Patient</div>
                <div className="value">{b.patientName || 'Kavya Reddy'} (Self)</div>
              </div>
            </div>

            <div className="video-detail-item">
              <FileText className="icon" />
              <div>
                <div className="label">Consultation fee</div>
                <div className="value">₹{b.totalAmount || 500} (Video consultation)</div>
              </div>
            </div>
          </div>
        </section>

        {/* Middle Column: Device Check & Join CTA */}
        <section className="video-card">
          <h2 className="video-card-title">Device check</h2>

          <div className="video-device-check-grid">
            {/* Camera Preview */}
            <div className="video-camera-preview">
              {cameraActive ? (
                <video ref={videoRef} autoPlay playsInline muted />
              ) : (
                <div className="video-camera-placeholder">
                  <Camera className="w-8 h-8 text-slate-500" />
                  <span>{cameraError || 'Loading camera feed…'}</span>
                </div>
              )}
              <div className={`video-camera-status-pill ${cameraActive ? 'working' : ''}`}>
                <Camera className="w-3.5 h-3.5" />
                <span>{cameraActive ? 'Camera is working' : 'Camera off'}</span>
              </div>
            </div>

            {/* Checks List */}
            <div className="video-checks-col">
              {/* Microphone Check */}
              <div className="video-check-row">
                <div className="video-check-icon green">
                  <Mic className="w-4 h-4" />
                </div>
                <div className="video-check-info">
                  <div className="name">Microphone</div>
                  <div className="video-audio-meter">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
                      <span
                        key={bar}
                        className={`video-audio-bar ${audioLevel >= bar ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                  <div className="status-text">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Sound detected</span>
                  </div>
                </div>
              </div>

              {/* Speaker Check */}
              <div className="video-check-row">
                <div className="video-check-icon teal">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div className="video-check-info">
                  <div className="name">Speaker</div>
                  <div className="status-text">Can you hear the sound?</div>
                </div>
                <button
                  type="button"
                  onClick={handleTestSpeaker}
                  className={`video-btn-test-speaker ${speakerTesting ? 'playing' : ''}`}
                >
                  {speakerTesting ? 'Playing…' : 'Test speaker'}
                </button>
              </div>

              {/* Internet Connection Check */}
              <div className="video-check-row">
                <div className="video-check-icon teal">
                  <Wifi className="w-4 h-4" />
                </div>
                <div className="video-check-info">
                  <div className="name">Internet connection</div>
                  <div className="status-text">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    <span>{isOnline ? 'Good Stable connection' : 'No connection'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Join CTA */}
          <button
            type="button"
            onClick={onJoin}
            disabled={!canJoin}
            className="video-join-cta-btn"
          >
            <Video className="w-5 h-5" />
            {canJoin ? 'Join consultation' : 'Join consultation'}
          </button>
          <p className="video-join-subtext">
            {canJoin
              ? 'Doctor has started the call. Click above to enter.'
              : "You'll be able to join when the doctor admits you."}
          </p>
        </section>

        {/* Right Column: Reports to share & Emergency notice */}
        <section className="video-card video-reports-card">
          <div>
            <h2 className="video-card-title" style={{ marginBottom: '4px' }}>
              Reports to share (optional)
            </h2>
            <p className="video-reports-subtitle">
              Attach reports, prescriptions or previous medical records for a better consultation.
            </p>
          </div>

          <div className="video-reports-actions">
            <button
              type="button"
              onClick={() => {
                // sample records from patient history
                onAddReport({
                  id: `rec-${Date.now()}`,
                  name: 'Previous Prescription (General Medicine).pdf',
                  size: '1.2 MB',
                });
              }}
              className="video-btn-outline orange"
            >
              <Paperclip className="w-3.5 h-3.5" />
              Add from my records
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="video-btn-outline blue"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload from device
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <p className="video-reports-format-hint">
              Supported formats: PDF, JPG, PNG (Max 10 MB each)
            </p>
          </div>

          {attachedReports.length > 0 && (
            <div className="video-attached-reports-list">
              {attachedReports.map((item) => (
                <div key={item.id} className="video-attached-item">
                  <span>📄 {item.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveReport(item.id)}
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Emergency Alert Banner */}
          <div className="video-emergency-box">
            <div className="video-emergency-icon">!</div>
            <div className="video-emergency-text">
              <div className="title">Not for emergencies — call 108.</div>
              <p className="desc">
                If you are experiencing a medical emergency, please call 108 or visit the nearest hospital.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default VideoWaitingRoom;
