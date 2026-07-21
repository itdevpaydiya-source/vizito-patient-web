import React, { useState } from 'react';
import { User, Plus, Users, CheckCircle2, AlertCircle, ArrowLeft, X } from 'lucide-react';
import { type FamilyMember, MOCK_FAMILY_MEMBERS } from '../../../../mocks/patientFlowMocks';

interface PatientSelectorStepProps {
  selectedPatient: FamilyMember | null;
  onSelectPatient: (patient: FamilyMember) => void;
  onNext: () => void;
  onBack: () => void;
  validationError?: string | null;
}

export const PatientSelectorStep: React.FC<PatientSelectorStepProps> = ({
  selectedPatient,
  onSelectPatient,
  onNext,
  onBack,
  validationError
}) => {
  const [familyMembersList, setFamilyMembersList] = useState<FamilyMember[]>(MOCK_FAMILY_MEMBERS);
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Add Member form state
  const [newName, setNewName] = useState('');
  const [newRel, setNewRel] = useState('Father');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState('Male');
  const [newBloodGroup, setNewBloodGroup] = useState('O+');

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newMember: FamilyMember = {
      id: `fam_${Date.now()}`,
      name: newName.trim(),
      relationship: newRel,
      age: parseInt(newAge) || 30,
      gender: newGender,
      bloodGroup: newBloodGroup
    };

    const updated = [...familyMembersList, newMember];
    setFamilyMembersList(updated);
    onSelectPatient(newMember);
    setIsAddingMember(false);

    // Reset inputs
    setNewName('');
    setNewAge('');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div>
        <span className="text-teal-600 font-bold text-xs uppercase tracking-wider">
          Step 3 — Choose Patient Profile
        </span>
        <h2 className="text-2xl font-black text-slate-800 mt-0.5">Select Patient</h2>
        <p className="text-slate-500 text-sm mt-1">
          Who is this booking for? Select yourself or a registered family member.
        </p>
      </div>

      {validationError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-700 text-sm font-bold animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Patient Selection Radio Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {familyMembersList.map((member) => {
          const isSelected = selectedPatient?.id === member.id;

          return (
            <div
              key={member.id}
              onClick={() => onSelectPatient(member)}
              className={`bg-white rounded-2xl border p-5 flex items-center justify-between cursor-pointer transition-all duration-200 group ${
                isSelected
                  ? 'border-teal-600 ring-2 ring-teal-600/20 shadow-sm bg-teal-50/20'
                  : 'border-slate-200 hover:border-teal-300'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Custom Radio Button Circle */}
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
                    isSelected
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-slate-300 group-hover:border-teal-500'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>

                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                  <User className="w-6 h-6" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-800 text-base">{member.name}</h3>
                    {member.isSelf && (
                      <span className="bg-teal-100 text-teal-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                        Self
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {member.relationship} &bull; {member.age} yrs &bull; Blood: {member.bloodGroup}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Family Member Card Button */}
        <button
          onClick={() => setIsAddingMember(true)}
          className="border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50 hover:bg-teal-50/30 rounded-2xl p-5 flex items-center justify-center gap-2 text-slate-600 hover:text-teal-700 font-bold transition-all text-sm group"
        >
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 group-hover:border-teal-400 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          <span>+ Add Family Member</span>
        </button>
      </div>

      {/* Add Family Member Modal / Drawer Form */}
      {isAddingMember && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" /> Add New Family Member
            </h4>
            <button
              onClick={() => setIsAddingMember(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddMemberSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Relationship</label>
              <select
                value={newRel}
                onChange={(e) => setNewRel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Spouse">Spouse</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Sibling">Sibling</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Age</label>
              <input
                type="number"
                required
                value={newAge}
                onChange={(e) => setNewAge(e.target.value)}
                placeholder="e.g. 58"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Blood Group</label>
              <select
                value={newBloodGroup}
                onChange={(e) => setNewBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingMember(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors"
              >
                Save Family Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back
        </button>

        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm transition-all shadow-xs active:scale-98"
        >
          Booking Details &rarr;
        </button>
      </div>
    </div>
  );
};
