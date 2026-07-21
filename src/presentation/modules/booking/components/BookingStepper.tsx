import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id: number;
  label: string;
}

interface BookingStepperProps {
  currentStep: number;
  steps: StepItem[];
  onStepClick: (stepId: number) => void;
}

export const BookingStepper: React.FC<BookingStepperProps> = ({
  currentStep,
  steps,
  onStepClick
}) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xs p-4 mb-6">
      <div className="flex items-center justify-between overflow-x-auto no-scrollbar py-1 px-2">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          const isNavigable = isCompleted && currentStep !== 7; // Can't navigate after confirmation

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle + Label */}
              <div
                onClick={() => isNavigable && onStepClick(step.id)}
                className={`flex flex-col items-center min-w-[70px] sm:min-w-[90px] cursor-pointer group ${
                  isNavigable ? 'hover:opacity-80' : ''
                }`}
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow-xs ${
                    isCompleted
                      ? 'bg-teal-600 text-white ring-2 ring-teal-600/30'
                      : isActive
                      ? 'bg-teal-700 text-white ring-4 ring-teal-600/20 font-extrabold scale-105'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 stroke-[3]" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <span
                  className={`text-[11px] sm:text-xs font-bold mt-2 text-center transition-colors truncate max-w-[85px] ${
                    isActive
                      ? 'text-teal-700 font-extrabold'
                      : isCompleted
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting Line between steps */}
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-[2px] mx-1 sm:mx-2 min-w-[16px] transition-colors ${
                    currentStep > step.id ? 'bg-teal-600' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
