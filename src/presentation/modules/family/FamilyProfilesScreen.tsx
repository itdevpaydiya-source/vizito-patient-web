import React, { useState, useEffect } from 'react';
import { 
  UserPlus, MoreVertical, Activity, Search, X, 
  Check, Trash2, Heart, ShieldAlert 
} from 'lucide-react';
import { MOCK_FAMILY_MEMBERS } from '../../../mocks/patientFlowMocks';

const FamilyProfilesScreen = () => {
  // Local States
  const [members, setMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('All');
  
  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form States
  const [memberName, setMemberName] = useState('');
  const [memberRelationship, setMemberRelationship] = useState('Spouse');
  const [memberAge, setMemberAge] = useState('');
  const [memberBlood, setMemberBlood] = useState('O+');
  const [selectedAvatar, setSelectedAvatar] = useState('https://i.pravatar.cc/150?img=33');

  // Avatar Options
  const avatars = [
    'https://i.pravatar.cc/150?img=11',
    'https://i.pravatar.cc/150?img=43',
    'https://i.pravatar.cc/150?img=12',
    'https://i.pravatar.cc/150?img=33',
    'https://i.pravatar.cc/150?img=47',
    'https://i.pravatar.cc/150?img=22',
  ];

  // Load from local storage or mocks
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vizito_patient_family');
      setMembers(stored ? JSON.parse(stored) : MOCK_FAMILY_MEMBERS);
    } catch (e) {
      console.error(e);
      setMembers(MOCK_FAMILY_MEMBERS);
    }
  }, []);

  // Filter Logic
  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Group child/son/daughter matching
    let matchesRelation = false;
    if (relationshipFilter === 'All') {
      matchesRelation = true;
    } else if (relationshipFilter === 'Child') {
      matchesRelation = member.relationship.toLowerCase() === 'son' || member.relationship.toLowerCase() === 'daughter' || member.relationship.toLowerCase() === 'child';
    } else {
      matchesRelation = member.relationship.toLowerCase() === relationshipFilter.toLowerCase();
    }

    return matchesSearch && matchesRelation;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName || !memberAge) {
      alert('Please fill out all fields.');
      return;
    }

    const newMember = {
      id: `fam_${Date.now()}`,
      name: memberName,
      relationship: memberRelationship,
      age: parseInt(memberAge),
      bloodGroup: memberBlood,
      imageUrl: selectedAvatar
    };

    const updated = [...members, newMember];
    setMembers(updated);
    localStorage.setItem('vizito_patient_family', JSON.stringify(updated));

    // Reset
    setMemberName('');
    setMemberAge('');
    setMemberRelationship('Spouse');
    setMemberBlood('O+');
    setIsAddOpen(false);
  };

  const deleteMember = (id: string) => {
    if (confirm('Are you sure you want to remove this family profile?')) {
      const updated = members.filter(m => m.id !== id);
      setMembers(updated);
      localStorage.setItem('vizito_patient_family', JSON.stringify(updated));
    }
    setActiveMenuId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Family Profiles</h2>
          <p className="text-slate-500 mt-1">Manage health files, emergency contacts, and schedules for your dependents.</p>
        </div>
        
        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-xs transition-all active:scale-95 shrink-0"
        >
          <UserPlus className="w-5 h-5" />
          Add Member
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search family member by name..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-xs font-semibold text-slate-700"
          />
        </div>

        {/* Filters pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {['All', 'Father', 'Mother', 'Spouse', 'Child'].map(rel => (
            <button
              key={rel}
              onClick={() => setRelationshipFilter(rel)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                relationshipFilter === rel 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              {rel}
            </button>
          ))}
        </div>
      </div>

      {/* Members Grid */}
      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map(member => (
            <div key={member.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col items-center text-center group hover:border-slate-350 hover:shadow-xs transition-all relative">
              
              {/* Options Trigger dropdown simulation */}
              <button 
                onClick={() => setActiveMenuId(activeMenuId === member.id ? null : member.id)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {/* Action Dropdown Menu */}
              {activeMenuId === member.id && (
                <div className="absolute top-12 right-4 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-10 w-36 text-left animate-in fade-in duration-100">
                  <button 
                    onClick={() => deleteMember(member.id)}
                    className="w-full px-4 py-2 hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Profile
                  </button>
                </div>
              )}
              
              <img 
                src={member.imageUrl} 
                alt={member.name} 
                className="w-20 h-20 rounded-full object-cover border-4 border-slate-100 mb-3 shadow-xs group-hover:scale-105 transition-transform" 
              />
              
              <h3 className="font-extrabold text-base text-slate-800">{member.name}</h3>
              <span className="px-3 py-0.5 rounded-full bg-slate-100 border border-slate-150 text-slate-600 text-[10px] font-bold mt-1 uppercase tracking-wider">
                {member.relationship}
              </span>

              <div className="w-full grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 mb-0.5 uppercase">Age</p>
                  <p className="font-black text-slate-700 text-sm">{member.age} yrs</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 mb-0.5 uppercase">Blood Group</p>
                  <p className="font-black text-rose-600 text-sm flex items-center justify-center gap-1">
                    <Activity className="w-3.5 h-3.5 shrink-0" />
                    {member.bloodGroup}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => alert(`Opening medical database log files for ${member.name}...`)}
                className="w-full mt-6 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
              >
                View Records
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
          <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-700 text-lg">No Profiles Found</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">Click 'Add Member' to configure a dependent profile card.</p>
        </div>
      )}

      {/* Add Family Member Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-800 text-base">Add Family Member</h3>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 text-xs font-semibold text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Relationship</label>
                  <select
                    value={memberRelationship}
                    onChange={(e) => setMemberRelationship(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 text-xs font-bold text-slate-700"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Age (Years)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    placeholder="e.g. 35"
                    value={memberAge}
                    onChange={(e) => setMemberAge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Blood Group</label>
                <select
                  value={memberBlood}
                  onChange={(e) => setMemberBlood(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 text-xs font-bold text-slate-700"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              {/* Avatar Selector Grid */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Select Profile Avatar</label>
                <div className="grid grid-cols-6 gap-3">
                  {avatars.map((url, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setSelectedAvatar(url)}
                      className={`relative rounded-full overflow-hidden border-2 transition-all aspect-square ${
                        selectedAvatar === url ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-100 hover:border-slate-350'
                      }`}
                    >
                      <img src={url} alt={`avatar-${idx}`} className="w-full h-full object-cover" />
                      {selectedAvatar === url && (
                        <div className="absolute inset-0 bg-teal-600/30 flex items-center justify-center text-white">
                          <Check className="w-4 h-4 shrink-0 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyProfilesScreen;
