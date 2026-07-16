import { useEffect, useState } from 'react';
import logoImg from '../assets/vizito_logo.png';

interface SplashProps {
  onComplete: () => void;
}

export default function Splash({ onComplete }: SplashProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress over 2 seconds
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300); // Small delay for visual completion
          return 100;
        }
        return prev + 5;
      });
    }, 80);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col justify-between items-center py-10 px-6 animate-fade">
      {/* Top spacer */}
      <div></div>

      {/* Center Branding & Loading */}
      <div className="flex flex-col items-center text-center max-w-sm">
        {/* Animated Clinical Icon */}
        <div className="relative mb-6">
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-3xl bg-teal-500/10 animate-ping duration-1000"></div>
          
          <div className="relative p-2.5 rounded-3xl bg-white border border-slate-100 shadow-lg shadow-teal-500/5">
            <img src={logoImg} alt="VIZITO Logo" className="w-20 h-20 object-contain" />
          </div>
        </div>

        {/* Brand Name */}
        {/* <h1 className="text-4xl font-extrabold tracking-wider text-slate-800 mb-2">
          VIZITO
        </h1> */}
        
        {/* Tagline */}
        <p className="text-slate-500 font-semibold text-sm tracking-wide mb-10">
          The heart of connected health care
        </p>

        {/* Simulated heartbeat pulse bar */}
        <div className="w-48 bg-slate-100 h-1.5 rounded-full overflow-hidden relative shadow-inner">
          <div 
            className="bg-teal-600 h-full rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className="text-[10px] text-slate-400 font-bold uppercase mt-2.5 tracking-widest font-mono">
          Loading Health Ecosystem... {progress}%
        </span>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center">
        <span className="text-xs font-bold text-slate-400 tracking-wider">
          VIZITO Web Portal
        </span>
        <span className="text-[10px] font-bold text-slate-300 tracking-widest mt-0.5 uppercase">
          Version 1.0.0 (Stable)
        </span>
      </div>
    </div>
  );
}
