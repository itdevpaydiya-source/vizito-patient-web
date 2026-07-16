import { MOCK_PROFILE_COMPLETION as MOCK_DATA } from '../../../mocks/doctorFlowMocks';
import { CheckCircle2, Circle } from 'lucide-react';

const ProfileCompletionTracker = () => {
  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Profile Completion</h2>
          <p className="text-sm text-slate-500 mt-1">Complete all steps to unlock settlements and verification.</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-extrabold text-teal-600">{MOCK_DATA.percentage}%</span>
          <span className="text-sm font-bold text-slate-400 block">Completed</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {MOCK_DATA.steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {step.completed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Circle className="w-5 h-5 text-slate-300" />
            )}
            <span className={`text-sm font-semibold ${step.completed ? 'text-slate-700' : 'text-slate-400'}`}>
              {step.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileCompletionTracker;
