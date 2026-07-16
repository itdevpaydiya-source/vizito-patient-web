import { useState } from 'react';
import { 
  Stethoscope, 
  Pill, 
  Microscope, 
  Activity, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle
} from 'lucide-react';
import logoImg from '../assets/vizito_logo.png';
import doctorImg from '../assets/doctor_consultation.png';
import pharmacyImg from '../assets/pharmacy_delivery.png';
import diagnosticImg from '../assets/diagnostic_testing.png';
import ecosystemImg from '../assets/healthcare_ecosystem.png';

interface WelcomeOnboardingProps {
  onGetStarted: () => void;
}

export default function WelcomeOnboarding({ onGetStarted }: WelcomeOnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Consult Trusted Doctors",
      tagline: "VERIFIED CLINICAL EXPERTS",
      description: "Book online and in-clinic consultations with verified healthcare professionals. Get digital prescriptions and immediate guidance.",
      icon: <Stethoscope className="w-16 h-16 text-teal-600" />,
      color: "from-teal-500/10 to-emerald-500/10",
      borderColor: "border-teal-100",
      badgeColor: "bg-teal-50 text-teal-800 border-teal-100",
      features: [
        "Digital prescriptions available instantly",
        "Video consultation + in-clinic visits",
        "24/7 emergency doctor dispatch chat"
      ],
      illustration: (
        <img src={doctorImg} alt="Doctor Consultation" className="w-full h-auto object-contain rounded-2xl shadow-lg border border-white/40" />
      )
    },
    {
      title: "Order Medicines",
      tagline: "DOORSTEP PHARMACY DELIVERY",
      description: "Upload your medical prescription and get verified pharmaceutical products delivered straight to your doorstep securely.",
      icon: <Pill className="w-16 h-16 text-rose-600" />,
      color: "from-rose-500/10 to-purple-500/10",
      borderColor: "border-rose-100",
      badgeColor: "bg-rose-50 text-rose-800 border-rose-100",
      features: [
        "100% genuine medical supplies",
        "Prescription verification by clinical pharmacists",
        "Express delivery option under 2 hours"
      ],
      illustration: (
        <img src={pharmacyImg} alt="Pharmacy Delivery" className="w-full h-auto object-contain rounded-2xl shadow-lg border border-white/40" />
      )
    },
    {
      title: "Book Diagnostics",
      tagline: "INTEGRATED PATHOLOGY LABS",
      description: "Book laboratory diagnostic tests and home sample collection. Access digital test reports online securely.",
      icon: <Microscope className="w-16 h-16 text-amber-600" />,
      color: "from-amber-500/10 to-yellow-500/10",
      borderColor: "border-amber-100",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-100",
      features: [
        "Certified professional home sample collectors",
        "Accredited diagnostic pathology labs",
        "Fast 12-hour digital report releases"
      ],
      illustration: (
        <img src={diagnosticImg} alt="Diagnostic Testing" className="w-full h-auto object-contain rounded-2xl shadow-lg border border-white/40" />
      )
    },
    {
      title: "Healthcare at Your Fingertips",
      tagline: "COMPLETE INTEGRATED PLATFORM",
      description: "Welcome to VIZITO. Access verified medical providers, pharmacies, diagnostics, ambulances, and more in a single clinical environment.",
      icon: <Activity className="w-16 h-16 text-sky-600" />,
      color: "from-sky-500/10 to-teal-500/10",
      borderColor: "border-sky-100",
      badgeColor: "bg-sky-50 text-sky-800 border-sky-100",
      features: [
        "HIPAA standards secure transactions",
        "Unified health records for patients",
        "Instant settlement releases for providers"
      ],
      illustration: (
        <img src={ecosystemImg} alt="Complete Healthcare Ecosystem" className="w-full h-auto object-contain rounded-2xl shadow-lg border border-white/40" />
      )
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onGetStarted();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-4 px-6 max-w-5xl mx-auto w-full animate-fade overflow-hidden">
      <div className="glass-panel w-full bg-white grid grid-cols-1 lg:grid-cols-12 border border-slate-100 shadow-2xl rounded-3xl overflow-hidden" style={{ height: 'calc(100vh - 2rem)' }}>
        
        {/* Left Grid Column - Visual Illustration */}
        <div className={`lg:col-span-5 bg-gradient-to-br ${slides[currentSlide].color} p-8 flex flex-col justify-between items-center border-r border-slate-50 relative`}>
          {/* Logo inside left content of onboarding card */}
          <div className="w-full flex justify-start mb-6">
            <img src={logoImg} alt="VIZITO Logo" className="h-12 w-auto object-contain" />
          </div>
          
          <div className="w-full max-w-sm flex-1 flex items-center justify-center">
            {slides[currentSlide].illustration}
          </div>
        </div>

        {/* Right Grid Column - Core Details and Actions */}
        <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-between bg-white relative overflow-y-auto">
          
          {/* Skip buttons for top of slide */}
          <div className="flex justify-between items-center mb-6">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${slides[currentSlide].badgeColor} uppercase tracking-wider`}>
              {slides[currentSlide].tagline}
            </span>
            {currentSlide < slides.length - 1 && (
              <button 
                onClick={onGetStarted}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Skip Onboarding
              </button>
            )}
          </div>

          {/* Core Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className={`p-3 rounded-2xl bg-slate-50 border ${slides[currentSlide].borderColor}`}>
                {slides[currentSlide].icon}
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">
                {slides[currentSlide].title}
              </h2>
            </div>
            
            <p className="text-slate-500 text-sm md:text-base leading-relaxed">
              {slides[currentSlide].description}
            </p>

            {/* Checklist details */}
            <ul className="space-y-2.5">
              {slides[currentSlide].features.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-3 text-xs md:text-sm font-semibold text-slate-600">
                  <CheckCircle className="w-4.5 h-4.5 text-teal-500 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stepper Footer */}
          <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
            {/* Dots */}
            <div className="flex gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentSlide ? 'w-6 bg-teal-600' : 'w-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {currentSlide > 0 && (
                <button
                  onClick={handlePrev}
                  className="btn btn-secondary py-2.5 px-4 text-xs flex items-center gap-1.5 shadow-sm border border-slate-200"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              )}

              <button
                onClick={handleNext}
                className="btn btn-primary py-2.5 px-5 text-xs shadow-md shadow-teal-600/10 flex items-center gap-1.5"
              >
                {currentSlide === slides.length - 1 ? (
                  <>
                    Get Started <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next Slide <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
