import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, FileText, Download, ChevronRight, Search, 
  X, CheckCircle2, Heart, Activity, Droplet, Plus, Info, 
  Trash2, AlertTriangle, FileUp
} from 'lucide-react';
import { MOCK_LAB_REPORTS, MOCK_HEALTH_VITALS } from '../../../mocks/patientFlowMocks';

const MyRecordsScreen = () => {
  // Local States
  const [records, setRecords] = useState<any[]>([]);
  const [vitals, setVitals] = useState<any[]>([]);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All'); // All, Lab Reports, Prescriptions, Other
  const [selectedStatus, setSelectedStatus] = useState('All'); // All, Available, Pending

  // Modal States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isVitalModalOpen, setIsVitalModalOpen] = useState(false);

  // Form States - Record Upload
  const [docName, setDocName] = useState('');
  const [docCategory, setDocCategory] = useState('Lab Reports');
  const [docLab, setDocLab] = useState('');
  const [docDate, setDocDate] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Form States - Vitals Add
  const [vitalName, setVitalName] = useState('Heart Rate');
  const [vitalValue, setVitalValue] = useState('');
  const [vitalUnit, setVitalUnit] = useState('bpm');

  // Load lists from mock data + localStorage
  useEffect(() => {
    try {
      const storedRecords = localStorage.getItem('vizito_patient_records');
      const storedVitals = localStorage.getItem('vizito_patient_vitals');

      setRecords(storedRecords ? JSON.parse(storedRecords) : MOCK_LAB_REPORTS);
      setVitals(storedVitals ? JSON.parse(storedVitals) : MOCK_HEALTH_VITALS);
    } catch (e) {
      console.error(e);
      setRecords(MOCK_LAB_REPORTS);
      setVitals(MOCK_HEALTH_VITALS);
    }
  }, []);

  // Filter Logic
  const filteredRecords = records.filter(rec => {
    const matchesSearch = 
      rec.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.labName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = 
      selectedCategory === 'All' || 
      (selectedCategory === 'Lab Reports' && rec.testName.toLowerCase().includes('blood') || rec.testName.toLowerCase().includes('lipid') || rec.testName.toLowerCase().includes('thyroid')) || // simple mock categories
      (selectedCategory === 'Prescriptions' && rec.testName.toLowerCase().includes('prescription')) ||
      (selectedCategory === 'Other' && !rec.testName.toLowerCase().includes('prescription') && !rec.testName.toLowerCase().includes('blood') && !rec.testName.toLowerCase().includes('lipid') && !rec.testName.toLowerCase().includes('thyroid'));

    const matchesStatus = 
      selectedStatus === 'All' || 
      rec.status.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Handle Record Upload
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName || !docLab || !docDate) {
      alert('Please fill out all fields.');
      return;
    }

    setIsUploading(true);
    // Simulate upload progress bar
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        
        // Add record
        const newRecord = {
          id: `rep_${Date.now()}`,
          testName: docName,
          date: docDate,
          status: 'Available',
          labName: docLab
        };
        
        const updatedRecords = [newRecord, ...records];
        setRecords(updatedRecords);
        localStorage.setItem('vizito_patient_records', JSON.stringify(updatedRecords));

        // Reset
        setIsUploading(false);
        setUploadProgress(0);
        setDocName('');
        setDocLab('');
        setDocDate('');
        setIsUploadModalOpen(false);
      }
    }, 250);
  };

  // Handle Vital Submission
  const handleVitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vitalValue) return;

    const newVital = {
      name: vitalName,
      value: vitalValue,
      unit: vitalUnit,
      status: 'normal'
    };

    // Remove duplicates of same vital name to avoid clutter
    const filteredBase = vitals.filter(v => v.name !== vitalName);
    const updatedVitals = [newVital, ...filteredBase];
    setVitals(updatedVitals);
    localStorage.setItem('vizito_patient_vitals', JSON.stringify(updatedVitals));

    setVitalValue('');
    setIsVitalModalOpen(false);
  };

  // Helper icons and colors for vitals
  const vitalIcons: Record<string, React.ElementType> = {
    'Heart Rate': Heart,
    'Blood Pressure': Activity,
    'Sugar (Fasting)': Droplet,
  };

  const vitalColors: Record<string, string> = {
    'Heart Rate': 'text-rose-600 bg-rose-50 border-rose-100',
    'Blood Pressure': 'text-sky-600 bg-sky-50 border-sky-100',
    'Sugar (Fasting)': 'text-violet-600 bg-violet-50 border-violet-100',
  };

  // Sync unit based on Vital Name selection
  const handleVitalNameChange = (name: string) => {
    setVitalName(name);
    if (name === 'Heart Rate') setVitalUnit('bpm');
    else if (name === 'Blood Pressure') setVitalUnit('mmHg');
    else if (name === 'Sugar (Fasting)') setVitalUnit('mg/dL');
    else setVitalUnit('');
  };

  const deleteRecord = (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      const updated = records.filter(r => r.id !== id);
      setRecords(updated);
      localStorage.setItem('vizito_patient_records', JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Records & Reports</h2>
          <p className="text-slate-500 mt-1">Manage and access your medical reports, uploaded prescriptions, and vitals.</p>
        </div>
        
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-xs transition-all active:scale-95 shrink-0"
        >
          <UploadCloud className="w-5 h-5" />
          Upload Record
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Medical Records */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Records Search and Filters Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search reports by name or lab..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-xs font-semibold text-slate-700"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-transparent border-0 text-xs font-bold text-slate-600 focus:ring-0 p-0 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Available">Available</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {['All', 'Lab Reports', 'Prescriptions', 'Other'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCategory === cat 
                      ? 'bg-teal-600 text-white shadow-xs' 
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Records Display list */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800">Files and Logs</h3>
            <div className="divide-y divide-slate-100">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((report) => (
                  <div key={report.id} className="py-4 flex items-center justify-between group hover:bg-slate-50/50 rounded-xl px-2 transition-colors -mx-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm group-hover:text-teal-700 transition-colors">{report.testName}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 font-semibold">{report.labName} • {report.date}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {report.status === 'Available' ? (
                        <button 
                          onClick={() => alert(`Downloading ${report.testName}...`)}
                          className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md uppercase tracking-wider">Pending</span>
                      )}
                      
                      <button 
                        onClick={() => deleteRecord(report.id)}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-sm">No health records found</p>
                  <p className="text-xs text-slate-400 mt-1">Try uploading a file or resetting filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Vitals Tracker */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">Health Vitals</h3>
              <button 
                onClick={() => setIsVitalModalOpen(true)}
                className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Reading
              </button>
            </div>

            <div className="space-y-3">
              {vitals.map((vital, idx) => {
                const Icon = vitalIcons[vital.name] || Activity;
                const colorClass = vitalColors[vital.name] || 'text-slate-600 bg-slate-50 border-slate-100';
                
                return (
                  <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-150 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-slate-700 text-xs">{vital.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 text-sm">{vital.value}</span>
                      <span className="text-[10px] font-bold text-slate-400 ml-1">{vital.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Record Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-black text-slate-800 text-base">Upload Health Document</h3>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUploadSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Document Name / Test Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Lipid Profile Report, CBC, Prescription"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Document Category</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-xs font-semibold"
                  >
                    <option value="Lab Reports">Lab Reports</option>
                    <option value="Prescriptions">Prescriptions</option>
                    <option value="Other">Other Log</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Date of Record</label>
                  <input 
                    type="date"
                    required
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Lab Name / Consulting Doctor</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. PathCare Labs, Dr. Sarah Jenkins"
                  value={docLab}
                  onChange={(e) => setDocLab(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-xs font-semibold"
                />
              </div>

              {/* Drag Drop Mock Area */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Attach Document (PDF/JPG)</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-slate-50 hover:border-teal-400 transition-all cursor-pointer">
                  <FileUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <span className="text-xs font-bold text-slate-500 block">Drag and drop file here, or browse</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Supports PDF, PNG, JPEG up to 10MB</span>
                </div>
              </div>

              {/* Progress bar simulation */}
              {isUploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Uploading health archive file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Upload & Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vitals Modal */}
      {isVitalModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden relative">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-800 text-base">Add Vital Reading</h3>
              <button 
                onClick={() => setIsVitalModalOpen(false)}
                className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVitalSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Select Vital Parameter</label>
                <select
                  value={vitalName}
                  onChange={(e) => handleVitalNameChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-xs font-bold text-slate-700"
                >
                  <option value="Heart Rate">Heart Rate (bpm)</option>
                  <option value="Blood Pressure">Blood Pressure (mmHg)</option>
                  <option value="Sugar (Fasting)">Sugar Fasting (mg/dL)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Recorded Reading Value</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 72, 120/80, 95"
                    value={vitalValue}
                    onChange={(e) => setVitalValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-xs font-bold text-slate-700 pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px] uppercase">
                    {vitalUnit}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVitalModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Reading
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRecordsScreen;
