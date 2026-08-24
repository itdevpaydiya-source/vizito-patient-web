import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, MoreVertical, Search, X, Trash2, AlertCircle, RotateCcw, User as UserIcon
} from 'lucide-react';
import {
  getMyUserId,
  getFamilyMembersApi,
  addFamilyMemberApi,
  removeFamilyMemberApi,
  FAMILY_RELATIONSHIPS,
  type PatientFamilyMember,
  type FamilyRelationship,
} from '../../../services/familyHelper';

const FamilyProfilesScreen = () => {
  const navigate = useNavigate();

  // Authenticated user's own users.id (needed for the path-scoped family API).
  const [userId, setUserId] = useState<number | null>(null);
  const [members, setMembers] = useState<PatientFamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState('All');

  // Modal + form
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [memberName, setMemberName] = useState('');
  const [memberRelationship, setMemberRelationship] = useState<FamilyRelationship>('Spouse');
  const [memberGender, setMemberGender] = useState('Male');
  const [memberDob, setMemberDob] = useState('');

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const uid = await getMyUserId();
      if (uid == null) {
        setLoadError('Unable to resolve your account. Please sign in again.');
        setMembers([]);
        return;
      }
      setUserId(uid);
      const list = await getFamilyMembersApi(uid);
      setMembers(list);
    } catch {
      setLoadError('Unable to load family members. Please try again.');
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRelation =
      relationshipFilter === 'All' ||
      member.relationship.toLowerCase() === relationshipFilter.toLowerCase();
    return matchesSearch && matchesRelation;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!memberName.trim()) {
      setFormError('Please enter the full name.');
      return;
    }
    if (userId == null) {
      setFormError('Your account could not be resolved. Please refresh.');
      return;
    }
    setSubmitting(true);
    try {
      // Map to the backend AddFamilyMemberDto. first_name is required; we send the full name in both
      // first_name and full_name so the linked User row has a usable display name.
      await addFamilyMemberApi(userId, {
        first_name: memberName.trim(),
        full_name: memberName.trim(),
        relationship: memberRelationship,
        gender: memberGender,
        date_of_birth: memberDob || undefined,
      });
      await loadMembers();
      setMemberName('');
      setMemberDob('');
      setMemberRelationship('Spouse');
      setMemberGender('Male');
      setIsAddOpen(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to add family member. Please try again.';
      setFormError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMember = async (associationId: string) => {
    setActiveMenuId(null);
    if (userId == null) return;
    if (!confirm('Remove this family profile?')) return;
    try {
      await removeFamilyMemberApi(userId, associationId);
      setMembers((prev) => prev.filter((m) => m.associationId !== associationId));
    } catch {
      alert('Failed to remove family member. Please try again.');
    }
  };

  const initialsOf = (name: string) =>
    name.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Family Profiles</h2>
          <p className="text-slate-500 mt-1">Manage the dependents you can book care for.</p>
        </div>
        <button
          onClick={() => { setFormError(null); setIsAddOpen(true); }}
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
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          {['All', ...FAMILY_RELATIONSHIPS].map((rel) => (
            <button
              key={rel}
              onClick={() => setRelationshipFilter(rel)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                relationshipFilter === rel ? 'bg-slate-800 text-white' : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              {rel}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs">
          <div className="w-7 h-7 border-[3px] border-slate-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">Loading family members...</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center shadow-xs space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <p className="text-rose-600 font-semibold text-sm">{loadError}</p>
          <button onClick={loadMembers} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl">
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      ) : filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <div key={member.associationId} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col items-center text-center group hover:shadow-xs transition-all relative">
              <button
                onClick={() => setActiveMenuId(activeMenuId === member.associationId ? null : member.associationId)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {activeMenuId === member.associationId && (
                <div className="absolute top-12 right-4 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-10 w-36 text-left animate-in fade-in duration-100">
                  <button
                    onClick={() => deleteMember(member.associationId)}
                    className="w-full px-4 py-2 hover:bg-rose-50 text-rose-600 text-xs font-bold flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Profile
                  </button>
                </div>
              )}

              {member.avatarUrl ? (
                <img src={member.avatarUrl} alt={member.name} className="w-20 h-20 rounded-full object-cover border-4 border-slate-100 mb-3 shadow-xs" />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-slate-100 mb-3 shadow-xs bg-teal-50 text-teal-700 flex items-center justify-center font-black text-2xl">
                  {initialsOf(member.name)}
                </div>
              )}

              <h3 className="font-extrabold text-base text-slate-800">{member.name}</h3>
              <span className="px-3 py-0.5 rounded-full bg-slate-100 border border-slate-150 text-slate-600 text-[10px] font-bold mt-1 uppercase tracking-wider">
                {member.relationship}
              </span>

              <div className="w-full grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 mb-0.5 uppercase">Age</p>
                  <p className="font-black text-slate-700 text-sm">{member.age != null ? `${member.age} yrs` : '—'}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 mb-0.5 uppercase">Gender</p>
                  <p className="font-black text-slate-700 text-sm">{member.gender || '—'}</p>
                </div>
              </div>

              <button
                onClick={() => navigate('/my-records')}
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
          <h3 className="font-bold text-slate-700 text-lg">No family members yet</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">Add a dependent to book consultations on their behalf.</p>
        </div>
      )}

      {/* Add Family Member Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-800 text-base">Add Family Member</h3>
              <button onClick={() => setIsAddOpen(false)} className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" /> <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                <input
                  type="text" required placeholder="e.g. Ramesh Patel"
                  value={memberName} onChange={(e) => setMemberName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 text-xs font-semibold text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Relationship</label>
                  <select
                    value={memberRelationship}
                    onChange={(e) => setMemberRelationship(e.target.value as FamilyRelationship)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 text-xs font-bold text-slate-700"
                  >
                    {FAMILY_RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Gender</label>
                  <select
                    value={memberGender} onChange={(e) => setMemberGender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 text-xs font-bold text-slate-700"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Date of Birth (optional)</label>
                <input
                  type="date" value={memberDob} onChange={(e) => setMemberDob(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 text-xs font-semibold text-slate-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs">
                  {submitting ? 'Saving...' : 'Save Profile'}
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
