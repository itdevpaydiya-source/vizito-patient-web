import { 
  User, 
  Stethoscope, 
  Building, 
  Building2, 
  Pill, 
  Microscope, 
  Home, 
  Truck, 
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

export type UserRole = 
  | 'patient' 
  | 'doctor' 
  | 'clinic' 
  | 'hospital' 
  | 'pharmacy' 
  | 'diagnostic' 
  | 'homecare' 
  | 'ambulance'
  | 'equipment';

interface UserTypeSelectionProps {
  onSelectRole: (role: UserRole) => void;
  onBackToLogin: () => void;
}

export default function UserTypeSelection({ onSelectRole, onBackToLogin }: UserTypeSelectionProps) {
  const roles = [
    {
      id: 'patient' as UserRole,
      title: "Patient / Health Seeker",
      description: "Book consultations, order medicines, access test reports, and manage family medical files.",
      icon: <User className="w-8 h-8 text-teal-600" />,
      tag: "Individual",
      color: "hover:border-teal-500/30 hover:shadow-teal-500/5 group-hover:bg-teal-50 group-hover:border-teal-100"
    },
    {
      id: 'doctor' as UserRole,
      title: "Medical Doctor",
      description: "Consult patients online or in clinic, write e-prescriptions, manage clinical schedules and earnings.",
      icon: <Stethoscope className="w-8 h-8 text-sky-600" />,
      tag: "Provider",
      color: "hover:border-sky-500/30 hover:shadow-sky-500/5 group-hover:bg-sky-50 group-hover:border-sky-100"
    },
    {
      id: 'clinic' as UserRole,
      title: "Clinic Facility",
      description: "Manage multiple doctors, appointments, reception queues, bills, and clinical operations.",
      icon: <Building className="w-8 h-8 text-teal-600" />,
      tag: "Facility",
      color: "hover:border-teal-500/30 hover:shadow-teal-500/5 group-hover:bg-teal-50 group-hover:border-teal-100"
    },
    {
      id: 'hospital' as UserRole,
      title: "Hospital Center",
      description: "Manage emergency services, bed availability, multi-department doctors, and ward logistics.",
      icon: <Building2 className="w-8 h-8 text-emerald-600" />,
      tag: "Facility",
      color: "hover:border-emerald-500/30 hover:shadow-emerald-500/5 group-hover:bg-emerald-50 group-hover:border-emerald-100"
    },
    {
      id: 'pharmacy' as UserRole,
      title: "Pharmacy / Drugstore",
      description: "Fulfill prescription orders, track medicine inventory, manage deliveries, and billing.",
      icon: <Pill className="w-8 h-8 text-rose-600" />,
      tag: "Retail",
      color: "hover:border-rose-500/30 hover:shadow-rose-500/5 group-hover:bg-rose-50 group-hover:border-rose-100"
    },
    {
      id: 'diagnostic' as UserRole,
      title: "Diagnostic Center / Lab",
      description: "Offer home sample collection, manage laboratory processing, and upload patient digital reports.",
      icon: <Microscope className="w-8 h-8 text-amber-600" />,
      tag: "Diagnostics",
      color: "hover:border-amber-500/30 hover:shadow-amber-500/5 group-hover:bg-amber-50 group-hover:border-amber-100"
    },
    {
      id: 'homecare' as UserRole,
      title: "Home Care Provider",
      description: "Offer physical therapy, nursing care, elderly assistance, and post-surgery patient services.",
      icon: <Home className="w-8 h-8 text-violet-600" />,
      tag: "Care Services",
      color: "hover:border-violet-500/30 hover:shadow-violet-500/5 group-hover:bg-violet-50 group-hover:border-violet-100"
    },
    {
      id: 'ambulance' as UserRole,
      title: "Ambulance Operator",
      description: "Receive dispatch alerts, track emergency fleets, and transport patients to critical care.",
      icon: <Truck className="w-8 h-8 text-cyan-600" />,
      tag: "Logistics",
      color: "hover:border-cyan-500/30 hover:shadow-cyan-500/5 group-hover:bg-cyan-50 group-hover:border-cyan-100"
    }
  ];

  return (
    <div className="flex-1 min-h-0 overflow-y-auto w-full animate-fade">
      <div className="flex flex-col items-center py-12 px-6 max-w-6xl mx-auto w-full min-h-full">
        <div className="w-full flex flex-col items-center my-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <button 
          onClick={onBackToLogin}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-700 text-xs font-bold uppercase transition-all mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </button>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-800">
          Create Your VIZITO Profile
        </h2>
        <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm md:text-base">
          Select your role to register and join the integrated healthcare ecosystem. Document verification can be completed from the dashboard.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-8">
        {roles.map((role) => (
          <div
            key={role.id}
            onClick={() => onSelectRole(role.id)}
            className={`group glass-panel cursor-pointer flex flex-col justify-between p-6 bg-white border border-slate-100 rounded-2xl relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1 ${role.color}`}
          >
            <div>
              {/* Badge/Tag */}
              <div className="flex justify-between items-center mb-4">
                <span className="p-3 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm transition-colors">
                  {role.icon}
                </span>
                <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {role.tag}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-bold text-slate-800 mb-2 group-hover:text-teal-600 transition-colors">
                {role.title}
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                {role.description}
              </p>
            </div>

            {/* Click/Action Trigger */}
            <div className="flex items-center gap-1 text-slate-400 font-bold text-xs group-hover:text-teal-600 transition-colors mt-6 pt-4 border-t border-slate-50">
              <span>Register</span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Helper message */}
      <div className="text-center text-slate-400 text-xs font-semibold">
        Already have an account? <button onClick={onBackToLogin} className="text-teal-600 font-bold hover:underline">Log in here</button>
      </div>
        </div>
      </div>
    </div>
  );
}
