import React, { useState } from 'react';
import { Camera, Pencil, CheckCircle2 } from 'lucide-react';

const fieldLabel = (text: string) => (
  <label className="block text-xs font-medium text-slate-500 mb-1">{text}</label>
);

const ReadField = ({ value, badge }: { value: string; badge?: 'verified' | 'pending' }) => (
  <div className="flex items-center gap-2">
    <span className="text-sm font-semibold text-slate-800">{value}</span>
    {badge === 'verified' && (
      <span className="text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">Verified</span>
    )}
    {badge === 'pending' && (
      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Pending</span>
    )}
  </div>
);

const PersonalInfoSection = () => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Section Header */}
      <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-800">Personal Information</h3>
          <p className="text-xs text-slate-500 mt-0.5">Update your personal details and profile information</p>
        </div>
        {isEditing ? (
          <button
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded-xl transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-teal-600 border border-teal-200 hover:bg-teal-50 px-3 py-1.5 rounded-xl transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>

      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-6 mb-6">
          {/* Profile Photo */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 group">
              <img
                src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200&h=200"
                alt="Profile"
                className="w-full h-full object-cover"
              />
              {isEditing && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            {isEditing && (
              <button className="text-xs font-semibold text-teal-600 hover:text-teal-700">Change Photo</button>
            )}
          </div>

          {/* Top Fields */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              {fieldLabel('Full Name')}
              {isEditing
                ? <input type="text" defaultValue="Dr. Arjun Reddy" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
                : <ReadField value="Dr. Arjun Reddy" />
              }
            </div>
            <div>
              {fieldLabel('Mobile Number')}
              {isEditing
                ? <input type="tel" defaultValue="+91 98765 43210" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
                : <ReadField value="+91 98765 43210" badge="verified" />
              }
            </div>
            <div>
              {fieldLabel('Email Address')}
              {isEditing
                ? <input type="email" defaultValue="arjun.reddy@vizito.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
                : <ReadField value="arjun.reddy@vizito.com" badge="verified" />
              }
            </div>
            <div>
              {fieldLabel('Date of Birth')}
              {isEditing
                ? <input type="date" defaultValue="1988-04-15" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
                : <ReadField value="15 Apr 1988" />
              }
            </div>
          </div>
        </div>

        {/* More Fields Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
          <div>
            {fieldLabel('Gender')}
            {isEditing
              ? <select defaultValue="Male" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"><option>Male</option><option>Female</option><option>Other</option></select>
              : <ReadField value="Male" />
            }
          </div>
          <div>
            {fieldLabel('Languages Known')}
            {isEditing
              ? <input type="text" defaultValue="English, Telugu, Hindi" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
              : <ReadField value="English, Telugu, Hindi" />
            }
          </div>
          <div>
            {fieldLabel('Blood Group')}
            {isEditing
              ? <select defaultValue="O+" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400"><option>A+</option><option>B+</option><option>O+</option><option>AB+</option><option>A-</option><option>B-</option><option>O-</option><option>AB-</option></select>
              : <ReadField value="O+" />
            }
          </div>
          <div className="sm:col-span-3">
            {fieldLabel('About Doctor')}
            {isEditing
              ? <textarea rows={3} defaultValue="Experienced Cardiologist with 10+ years of expertise in interventional cardiology and preventive heart care." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 resize-none" />
              : <p className="text-sm text-slate-700 leading-relaxed">Experienced Cardiologist with 10+ years of expertise in interventional cardiology and preventive heart care.</p>
            }
          </div>
        </div>

        {/* Contact Information */}
        <div className="border-t border-slate-100 pt-5 mt-2">
          <h4 className="text-sm font-bold text-slate-700 mb-4">Contact Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              {fieldLabel('Address')}
              {isEditing
                ? <textarea rows={2} defaultValue="Plot No. 45, Road No. 12, Banjara Hills, Hyderabad, Telangana - 500034" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 resize-none" />
                : <p className="text-sm text-slate-700 leading-relaxed">Plot No. 45, Road No. 12, Banjara Hills,<br />Hyderabad, Telangana - 500034</p>
              }
            </div>
            <div>
              {fieldLabel('Landmark')}
              {isEditing
                ? <input type="text" defaultValue="Near City Center Mall" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
                : <ReadField value="Near City Center Mall" />
              }
            </div>
            <div>
              {fieldLabel('City')}
              {isEditing
                ? <input type="text" defaultValue="Hyderabad" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
                : <ReadField value="Hyderabad" />
              }
            </div>
            <div>
              {fieldLabel('State')}
              {isEditing
                ? <input type="text" defaultValue="Telangana" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
                : <ReadField value="Telangana" />
              }
            </div>
            <div>
              {fieldLabel('Pincode')}
              {isEditing
                ? <input type="text" defaultValue="500034" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
                : <ReadField value="500034" />
              }
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="border-t border-slate-100 pt-5 mt-5">
          <h4 className="text-sm font-bold text-slate-700 mb-4">Emergency Contact</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              {fieldLabel('Contact Person')}
              {isEditing
                ? <input type="text" defaultValue="Ramesh Reddy (Brother)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
                : <ReadField value="Ramesh Reddy (Brother)" />
              }
            </div>
            <div>
              {fieldLabel('Relationship')}
              {isEditing
                ? <input type="text" defaultValue="Brother" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
                : <ReadField value="Brother" />
              }
            </div>
            <div>
              {fieldLabel('Mobile Number')}
              {isEditing
                ? <input type="tel" defaultValue="+91 91234 56789" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400" />
                : <ReadField value="+91 91234 56789" />
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfoSection;
