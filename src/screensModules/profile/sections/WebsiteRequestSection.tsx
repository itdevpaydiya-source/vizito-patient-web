import React, { useState } from 'react';
import SectionHeader from '../components/SectionHeader';
import { Globe, ArrowRight } from 'lucide-react';

const WebsiteRequestSection = () => {
  const [status, setStatus] = useState('Not Requested'); // Mock state
  const [urlName, setUrlName] = useState('');
  const [notes, setNotes] = useState('');

  const handleRequest = () => {
    setStatus('Under Review');
  };

  return (
    <div className="bg-gradient-to-br from-teal-900 to-teal-800 border border-teal-700/60 rounded-2xl p-6 shadow-sm relative overflow-hidden">
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Globe className="w-5 h-5 text-teal-300" />
            </div>
            <h3 className="text-xl font-bold text-white">Personal Webpage Request</h3>
          </div>
          <p className="text-teal-200 text-sm mb-6 leading-relaxed">
            Get a beautifully designed, SEO-optimized personal webpage within the vizito ecosystem.
            Allow patients to discover your profile, read reviews, and book appointments directly.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-teal-400 rounded-full" />
              <span className="text-sm text-teal-100">Showcase your qualifications & experience</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-teal-400 rounded-full" />
              <span className="text-sm text-teal-100">Direct appointment booking integration</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-teal-400 rounded-full" />
              <span className="text-sm text-teal-100">Patient reviews and ratings display</span>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white/10 border border-white/10 rounded-xl p-5 backdrop-blur-md">
          {status === 'Not Requested' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-teal-200 uppercase tracking-wider mb-1">Preferred URL Name</label>
                <div className="flex items-center">
                  <span className="bg-teal-900/50 text-teal-300 px-3 py-2.5 text-sm rounded-l-xl border border-r-0 border-white/10">vizito.com/doctors/</span>
                  <input
                    type="text"
                    value={urlName}
                    onChange={(e) => setUrlName(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-r-xl px-3 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 transition-all placeholder-teal-300/50"
                    placeholder="your-name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-teal-200 uppercase tracking-wider mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-teal-400/50 transition-all resize-none placeholder-teal-300/50"
                  placeholder="Any specific requests for your webpage..."
                />
              </div>
              <button
                onClick={handleRequest}
                className="w-full bg-white hover:bg-teal-50 text-teal-900 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors mt-2"
              >
                Submit Request
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center mb-3">
                <Globe className="w-6 h-6 text-teal-300 animate-pulse" />
              </div>
              <h4 className="text-white font-bold text-lg mb-1">Request {status}</h4>
              <p className="text-sm text-teal-200">
                Your webpage request for <span className="font-semibold text-white">vizito.com/doctors/{urlName || 'dr-sarah'}</span> is currently being processed by our team.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebsiteRequestSection;
