import React from 'react';
import {
  Stethoscope,
  Building2,
  Home,
  Truck,
  Pill,
  Microscope,
  Accessibility,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { MOCK_BOOKING_SERVICES, type HealthcareServiceOption } from '../../../../mocks/universalBookingMocks';

interface ServiceSelectorStepProps {
  selectedServiceId?: string;
  onSelectService: (service: HealthcareServiceOption) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Stethoscope,
  Building2,
  Home,
  Truck,
  Pill,
  Microscope,
  Accessibility
};

export const ServiceSelectorStep: React.FC<ServiceSelectorStepProps> = ({
  selectedServiceId,
  onSelectService
}) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div>
        <div className="flex items-center gap-2 text-teal-600 font-bold text-xs uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" />
          Step 1 — Choose Healthcare Category
        </div>
        <h2 className="text-2xl font-black text-slate-800">Select a Service</h2>
        <p className="text-slate-500 text-sm mt-1">
          Select the healthcare service you want to book. One unified workflow for all care types.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_BOOKING_SERVICES.map((service) => {
          const IconComponent = ICON_MAP[service.iconName] || Stethoscope;
          const isSelected = selectedServiceId === service.id;

          return (
            <div
              key={service.id}
              onClick={() => onSelectService(service)}
              className={`relative bg-white rounded-2xl border p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 group hover:shadow-md ${
                isSelected
                  ? 'border-teal-600 ring-2 ring-teal-600/20 shadow-md bg-teal-50/20'
                  : 'border-slate-200 hover:border-teal-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {service.emoji}
                  </div>
                  <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    Select &rarr;
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-teal-700 transition-colors">
                  {service.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                  {service.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-teal-600">
                <span>Unified Standardized Flow</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
