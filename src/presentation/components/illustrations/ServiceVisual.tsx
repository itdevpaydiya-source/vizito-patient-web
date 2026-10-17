import React, { useState } from 'react';
import ServiceArt from './ServiceArt';

// A service's picture: the reviewed photo when we have one, otherwise (or if it fails to load) the
// Vizito illustration. Photos are generic scenes of the kind of care, never a specific business.
const PHOTOS: Record<string, { src: string; alt: string }> = {
  doctor: { src: '/images/healthcare/services/doctor.webp', alt: 'Doctor consulting a patient in a bright clinic' },
  hospital: { src: '/images/healthcare/services/hospital.webp', alt: 'Hospital reception with staff helping a patient' },
  homecare: { src: '/images/healthcare/services/homecare.webp', alt: 'Nurse checking an elderly patient’s blood pressure at home' },
  ambulance: { src: '/images/healthcare/services/ambulance.webp', alt: 'Paramedics loading a patient into an ambulance' },
  pharmacy: { src: '/images/healthcare/services/pharmacy.webp', alt: 'Pharmacist handing medicines to a customer' },
  diagnostic: { src: '/images/healthcare/services/lab.webp', alt: 'Lab technician placing blood sample tubes in a rack' },
  equipment: { src: '/images/healthcare/services/equipment.webp', alt: 'Oxygen concentrator and wheelchair in a bright room' },
};

const ServiceVisual: React.FC<{ id: string; className?: string; muted?: boolean }> = ({ id, className, muted }) => {
  const photo = PHOTOS[id];
  const [failed, setFailed] = useState(false);
  if (!photo || failed) return <ServiceArt id={id} muted={muted} className={className} />;
  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className || ''}`}>
      <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" onError={() => setFailed(true)}
        className={`w-full h-full object-cover ${muted ? 'grayscale opacity-60' : ''}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
    </div>
  );
};

export default ServiceVisual;
