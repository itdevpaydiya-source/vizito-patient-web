import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, AlertCircle } from 'lucide-react';
import { MOCK_PROFILE_COMPLETION } from '../mocks/doctorFlowMocks';

interface Props {
  completionPercentage: number;
}

const ProfileCompletionBanner: React.FC<Props> = ({ completionPercentage }) => {
  const navigate = useNavigate();
  const [isDismissed, setIsDismissed] = useState(false);

  // Load from sessionStorage to support "Next Login" simulation (remains hidden during current session)
  useEffect(() => {
    const isClosed = sessionStorage.getItem('profile_banner_closed') === 'true';
    const isReminded = sessionStorage.getItem('profile_banner_reminded') === 'true';
    if (isClosed || isReminded) {
      setIsDismissed(true);
    }
  }, []);

  if (completionPercentage >= 100 || isDismissed) return null;

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (completionPercentage / 100) * circumference;

  // Get pending sections from MOCK_PROFILE_COMPLETION steps
  const pendingSections = MOCK_PROFILE_COMPLETION.steps
    .filter(step => !step.completed)
    .map(step => step.name);

  const handleBannerClick = () => {
    // Navigate to profile screen (auto-loading first pending tab)
    navigate('/profile');
  };

  const handleRemindLater = (e: React.MouseEvent) => {
    e.stopPropagation();
    sessionStorage.setItem('profile_banner_reminded', 'true');
    setIsDismissed(true);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    sessionStorage.setItem('profile_banner_closed', 'true');
    setIsDismissed(true);
  };

  const handleCompleteProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/profile');
  };

  return (
    <div 
      onClick={handleBannerClick}
      className="bg-gradient-to-r from-[#FAF5FF]/60 to-[#FEF3C7]/20 border border-[#E9D5FF] rounded-2xl p-5 shadow-sm relative overflow-hidden cursor-pointer hover:border-[#5C2494]/50 transition-all group"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        {/* Left Section: Circular Progress and Text Description */}
        <div className="flex items-start sm:items-center gap-4 flex-1">
          {/* Circular Progress Indicator */}
          <div className="relative w-14 h-14 shrink-0 bg-white rounded-full flex items-center justify-center shadow-inner">
            <svg viewBox="0 0 44 44" className="w-14 h-14 -rotate-90">
              <circle cx="22" cy="22" r={radius} fill="none" stroke="#F3E8FF" strokeWidth="4" />
              <circle
                cx="22" cy="22" r={radius} fill="none"
                stroke="#5C2494" strokeWidth="4"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#5C2494]">
              {completionPercentage}%
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800 group-hover:text-[#5C2494] transition-colors leading-tight">
              Complete your profile to enable settlements and verification.
            </h3>
            <p className="text-xs text-slate-500 leading-normal">
              Profile completion is required before receiving payments.
            </p>
            {pendingSections.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5 bg-[#FAF5FF]/60 border border-[#E9D5FF] rounded-lg px-2.5 py-1 w-fit">
                <AlertCircle className="w-3.5 h-3.5 text-[#5C2494]" />
                <span className="text-[10px] font-bold text-slate-600">Pending Sections: </span>
                <span className="text-[10px] font-medium text-slate-600">{pendingSections.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Interactive CTA Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={handleCompleteProfile}
            className="bg-gradient-to-r from-[#5C2494] to-[#7C3AED] hover:opacity-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm shadow-purple-500/10 active:scale-95 whitespace-nowrap"
          >
            Complete Profile
          </button>
          <button 
            onClick={handleRemindLater}
            className="bg-white border border-[#DEDFE0] hover:bg-slate-50 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl transition-colors active:scale-95 whitespace-nowrap"
          >
            Remind Me Later
          </button>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
            aria-label="Close banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionBanner;
