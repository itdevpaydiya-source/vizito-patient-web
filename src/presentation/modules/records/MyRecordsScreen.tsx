import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Upload,
  FileText,
  Download,
  Share2,
  Trash2,
  Eye,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  Calendar,
  Filter,
  FileCheck,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { MOCK_FAMILY_MEMBERS, type FamilyMember } from '../../../mocks/patientFlowMocks';

export interface MedicalRecordItem {
  id: string;
  documentName: string;
  category:
    | 'Prescriptions'
    | 'Laboratory Reports'
    | 'Diagnostic Reports'
    | 'Discharge Summaries'
    | 'Vaccination Records'
    | 'Medical Certificates'
    | 'Other Medical Documents';
  patientId: string;
  patientName: string;
  uploadDate: string;
  fileType: 'PDF' | 'JPG' | 'PNG';
  fileSize?: string;
  labOrDoctorName?: string;
  previewUrl?: string;
}

export const INITIAL_MEDICAL_RECORDS: MedicalRecordItem[] = [
  // Myself (self)
  {
    id: 'rec_001',
    documentName: 'Blood Test & Lipid Profile Report',
    category: 'Laboratory Reports',
    patientId: 'self',
    patientName: 'Ravi Kumar (Me)',
    uploadDate: '20 July 2026',
    fileType: 'PDF',
    fileSize: '1.4 MB',
    labOrDoctorName: 'Viziito PathCare Central Diagnostics',
    previewUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'rec_002',
    documentName: 'Cardiology Prescription - Dr. Sarah Jenkins',
    category: 'Prescriptions',
    patientId: 'self',
    patientName: 'Ravi Kumar (Me)',
    uploadDate: '18 July 2026',
    fileType: 'JPG',
    fileSize: '850 KB',
    labOrDoctorName: 'Dr. Sarah Jenkins (Cardiologist)',
    previewUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'rec_003',
    documentName: 'Chest X-Ray Diagnostic Scan',
    category: 'Diagnostic Reports',
    patientId: 'self',
    patientName: 'Ravi Kumar (Me)',
    uploadDate: '10 July 2026',
    fileType: 'PNG',
    fileSize: '2.8 MB',
    labOrDoctorName: 'Apollo Health City Radiology',
    previewUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&auto=format&fit=crop&q=80'
  },

  // Father (fam_1)
  {
    id: 'rec_004',
    documentName: 'ECHO Cardiogram & ECG Report',
    category: 'Diagnostic Reports',
    patientId: 'fam_1',
    patientName: 'Ramesh Kumar (Father)',
    uploadDate: '15 July 2026',
    fileType: 'PDF',
    fileSize: '3.1 MB',
    labOrDoctorName: 'Care Hospital Cardiac Department',
    previewUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'rec_005',
    documentName: 'Diabetes Chronic Care Prescription',
    category: 'Prescriptions',
    patientId: 'fam_1',
    patientName: 'Ramesh Kumar (Father)',
    uploadDate: '12 July 2026',
    fileType: 'PDF',
    fileSize: '620 KB',
    labOrDoctorName: 'Dr. Rahul Sharma',
    previewUrl: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=600&auto=format&fit=crop&q=80'
  },

  // Mother (fam_2)
  {
    id: 'rec_006',
    documentName: 'Thyroid Profile & Vitamin D Test',
    category: 'Laboratory Reports',
    patientId: 'fam_2',
    patientName: 'Sunita Kumar (Mother)',
    uploadDate: '14 July 2026',
    fileType: 'PDF',
    fileSize: '1.1 MB',
    labOrDoctorName: 'Vijaya Diagnostic Center',
    previewUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'rec_007',
    documentName: 'Covaxin Booster Vaccination Certificate',
    category: 'Vaccination Records',
    patientId: 'fam_2',
    patientName: 'Sunita Kumar (Mother)',
    uploadDate: '01 June 2026',
    fileType: 'PDF',
    fileSize: '450 KB',
    labOrDoctorName: 'Ministry of Health CoWIN Portal',
    previewUrl: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=600&auto=format&fit=crop&q=80'
  },

  // Daughter (fam_3)
  {
    id: 'rec_008',
    documentName: 'Pediatric Immunization Chart',
    category: 'Vaccination Records',
    patientId: 'fam_3',
    patientName: 'Ananya Kumar (Daughter)',
    uploadDate: '05 May 2026',
    fileType: 'JPG',
    fileSize: '1.2 MB',
    labOrDoctorName: 'Rainbow Children Hospital',
    previewUrl: 'https://images.unsplash.com/photo-1594824813566-88855ce78907?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 'rec_009',
    documentName: 'School Fitness & Vision Certificate',
    category: 'Medical Certificates',
    patientId: 'fam_3',
    patientName: 'Ananya Kumar (Daughter)',
    uploadDate: '10 June 2026',
    fileType: 'PDF',
    fileSize: '500 KB',
    labOrDoctorName: 'Dr. Anita Desai',
    previewUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80'
  }
];

export const CATEGORIES_LIST = [
  'All',
  'Prescriptions',
  'Laboratory Reports',
  'Diagnostic Reports',
  'Discharge Summaries',
  'Vaccination Records',
  'Medical Certificates',
  'Other Medical Documents'
] as const;

export default function MyRecordsScreen() {
  const navigate = useNavigate();

  // State
  const [selectedPatientId, setSelectedPatientId] = useState<string>('self');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<MedicalRecordItem[]>([]);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<MedicalRecordItem | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<MedicalRecordItem | null>(null);
  const [shareRecord, setShareRecord] = useState<MedicalRecordItem | null>(null);
  
  // Toast & Notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Form State - Upload
  const [formPatientId, setFormPatientId] = useState('self');
  const [formCategory, setFormCategory] = useState<MedicalRecordItem['category']>('Prescriptions');
  const [formDocName, setFormDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Image Zoom & Viewer state inside Preview modal
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Load records from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vizito_patient_records');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecords([...parsed, ...INITIAL_MEDICAL_RECORDS]);
          return;
        }
      }
      setRecords(INITIAL_MEDICAL_RECORDS);
    } catch (e) {
      console.error(e);
      setRecords(INITIAL_MEDICAL_RECORDS);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter records per patient profile, category, and search query
  const patientRecords = records.filter((r) => {
    const matchesPatient = selectedPatientId === 'all_patients' || r.patientId === selectedPatientId;
    const matchesCategory = selectedCategory === 'All' || r.category === selectedCategory;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      r.documentName.toLowerCase().includes(searchLower) ||
      r.category.toLowerCase().includes(searchLower) ||
      (r.labOrDoctorName && r.labOrDoctorName.toLowerCase().includes(searchLower));

    return matchesPatient && matchesCategory && matchesSearch;
  });

  // Handle File Upload Form Submission
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!formCategory) {
      setUploadError('Please select a record category.');
      return;
    }
    if (!formDocName || !formDocName.trim()) {
      setUploadError('Document name is required.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Please choose a file.');
      return;
    }

    // Supported formats validation: PDF, JPG, JPEG, PNG
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      setUploadError('Unsupported file format. Please upload PDF, JPG, JPEG, or PNG.');
      return;
    }

    const patientObj = MOCK_FAMILY_MEMBERS.find((m) => m.id === formPatientId) || MOCK_FAMILY_MEMBERS[0];

    const newRecord: MedicalRecordItem = {
      id: `rec_${Date.now()}`,
      documentName: formDocName.trim(),
      category: formCategory,
      patientId: formPatientId,
      patientName: patientObj.name,
      uploadDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      fileType: ext?.toUpperCase() === 'PDF' ? 'PDF' : ext?.toUpperCase() === 'PNG' ? 'PNG' : 'JPG',
      fileSize: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
      labOrDoctorName: 'Patient Upload',
      previewUrl: URL.createObjectURL(selectedFile)
    };

    const updated = [newRecord, ...records];
    setRecords(updated);
    try {
      localStorage.setItem('vizito_patient_records', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    // Reset Form
    setIsUploadOpen(false);
    setFormDocName('');
    setSelectedFile(null);
    setUploadError(null);
    showToast('Medical record uploaded successfully.');
  };

  // Handle File Input Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      setUploadError('Unsupported file format. Please select PDF, JPG, JPEG, or PNG.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    if (!formDocName) {
      // Auto-fill document name without extension
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setFormDocName(nameWithoutExt.replace(/[-_]/g, ' '));
    }
  };

  // Handle Download Record
  const handleDownload = (record: MedicalRecordItem) => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      showToast('Download completed.');
    }, 1200);
  };

  // Handle Delete Record
  const handleConfirmDelete = () => {
    if (!deleteRecord) return;

    const updated = records.filter((r) => r.id !== deleteRecord.id);
    setRecords(updated);
    try {
      localStorage.setItem('vizito_patient_records', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    setDeleteRecord(null);
    if (viewRecord?.id === deleteRecord.id) {
      setViewRecord(null);
    }
    showToast('Medical record deleted successfully.');
  };

  // Handle Share Record to Booking (Pharmacy / Diagnostic Lab)
  const handleConfirmShare = (targetService: 'pharmacy' | 'diagnostic') => {
    if (!shareRecord) return;
    setShareRecord(null);
    showToast('Medical record attached successfully.');
    navigate(`/booking?service=${targetService}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Medical Records</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Securely store, organize, view, download, and share health documents for yourself and family members.
          </p>
        </div>

        <button
          onClick={() => {
            setUploadError(null);
            setIsUploadOpen(true);
          }}
          className="self-start sm:self-auto flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-98"
        >
          <Plus className="w-4 h-4" /> Upload Record
        </button>
      </div>

      {/* Top Filter Bar: Patient Selector & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Patient Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-600" /> Patient:
            </span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="all_patients">All Family Members</option>
              {MOCK_FAMILY_MEMBERS.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.relationship ? `(${member.relationship})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search medical records by document name or category..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto modal-scrollbar">
        {CATEGORIES_LIST.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedCategory === cat
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Medical Record List Grid */}
      {patientRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {patientRecords.map((record) => (
            <div
              key={record.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between hover:shadow-xl transition-all duration-300 relative group"
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-teal-50 text-teal-700 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-teal-100">
                    {record.category}
                  </span>
                  <span className="text-[10px] font-black font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {record.fileType}
                  </span>
                </div>

                {/* File Name & Patient Info */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-teal-600 font-bold shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-slate-800 text-sm truncate group-hover:text-teal-700 transition-colors">
                      {record.documentName}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                      Patient: {record.patientName}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-600 font-medium bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold">Uploaded:</span>
                    <span className="font-bold text-slate-800">{record.uploadDate}</span>
                  </div>
                  {record.labOrDoctorName && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">Source:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[150px]">{record.labOrDoctorName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                <button
                  onClick={() => {
                    setZoomLevel(1);
                    setRotation(0);
                    setViewRecord(record);
                  }}
                  className="p-2 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                  title="View Details & Preview"
                >
                  <Eye className="w-4 h-4" /> View
                </button>

                <button
                  onClick={() => handleDownload(record)}
                  className="p-2 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                  title="Download Record"
                >
                  <Download className="w-4 h-4" /> Download
                </button>

                <button
                  onClick={() => setShareRecord(record)}
                  className="p-2 text-slate-600 hover:text-teal-700 hover:bg-slate-100 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                  title="Share with Pharmacy or Diagnostic Lab"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>

                <button
                  onClick={() => setDeleteRecord(record)}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors text-xs font-bold"
                  title="Delete Record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 py-16 px-4 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <FileSpreadsheet className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-base">No Medical Records Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
            {searchTerm
              ? 'No documents match your search query.'
              : 'Upload your first medical record to store prescriptions, lab reports, and vaccination charts.'}
          </p>
          <button
            onClick={() => {
              setUploadError(null);
              setIsUploadOpen(true);
            }}
            className="mt-2 inline-flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md"
          >
            <Plus className="w-4 h-4" /> Upload Record
          </button>
        </div>
      )}

      {/* Upload Medical Record Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 text-teal-700">
                <Upload className="w-5 h-5 text-teal-600" /> Upload Medical Record
              </h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* Patient Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Patient</label>
                <select
                  value={formPatientId}
                  onChange={(e) => setFormPatientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                >
                  {MOCK_FAMILY_MEMBERS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.relationship ? `(${m.relationship})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Record Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                >
                  <option value="Prescriptions">Prescription</option>
                  <option value="Laboratory Reports">Lab Report</option>
                  <option value="Diagnostic Reports">Diagnostic Report</option>
                  <option value="Discharge Summaries">Discharge Summary</option>
                  <option value="Vaccination Records">Vaccination</option>
                  <option value="Medical Certificates">Certificate</option>
                  <option value="Other Medical Documents">Other</option>
                </select>
              </div>

              {/* Document Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Name</label>
                <input
                  type="text"
                  value={formDocName}
                  onChange={(e) => setFormDocName(e.target.value)}
                  placeholder="e.g. Blood Test Report, Cardio Prescription"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* File Upload Component */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Upload File (PDF, JPG, JPEG, PNG)</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-2xl p-6 text-center bg-slate-50 transition-colors relative cursor-pointer group">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {selectedFile ? (
                    <div className="space-y-1">
                      <FileCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                      <p className="font-extrabold text-slate-800">{selectedFile.name}</p>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        ✓ Ready ({ (selectedFile.size / 1024).toFixed(0) } KB)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto group-hover:text-teal-600 transition-colors" />
                      <p className="font-extrabold text-slate-700">Drop File Here</p>
                      <p className="text-[10px] text-slate-400 font-medium">or Browse from device</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all"
                >
                  Upload Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Details & Document Preview Modal */}
      {viewRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto modal-scrollbar shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 p-6 space-y-5">
            
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-extrabold text-teal-700 uppercase tracking-wider bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-100">
                  {viewRecord.category}
                </span>
                <h2 className="text-xl font-extrabold text-slate-800 mt-1">{viewRecord.documentName}</h2>
                <p className="text-xs font-semibold text-slate-500">Patient: {viewRecord.patientName}</p>
              </div>

              <button
                onClick={() => setViewRecord(null)}
                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Info */}
            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100 font-medium">
              <div>
                <span className="text-slate-400 block font-bold">Uploaded Date</span>
                <span className="font-extrabold text-slate-800">{viewRecord.uploadDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">File Format</span>
                <span className="font-extrabold text-slate-800">{viewRecord.fileType} ({viewRecord.fileSize || '1.0 MB'})</span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">Source</span>
                <span className="font-extrabold text-slate-800 truncate block">{viewRecord.labOrDoctorName || 'Patient Upload'}</span>
              </div>
            </div>

            {/* Document Preview Component */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-900 text-white relative min-h-[300px] flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold mb-3 z-10">
                <span className="text-slate-300">Document Preview ({viewRecord.fileType})</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoomLevel((prev) => Math.max(0.5, prev - 0.25))}
                    className="p-1 hover:bg-slate-700 rounded text-slate-300"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] text-slate-400">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.25))}
                    className="p-1 hover:bg-slate-700 rounded text-slate-300"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="p-1 hover:bg-slate-700 rounded text-slate-300"
                    title="Rotate"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* PDF or Image Viewer */}
              <div className="flex-1 flex items-center justify-center overflow-auto p-4 modal-scrollbar min-h-[240px]">
                {viewRecord.fileType === 'PDF' ? (
                  <div className="text-center space-y-3 p-6 bg-slate-800/60 rounded-2xl border border-slate-700 max-w-md">
                    <FileText className="w-12 h-12 text-teal-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-200">{viewRecord.documentName}</p>
                    <span className="text-[10px] text-teal-300 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800 inline-block font-mono">
                      PDF Document • Embedded View Active
                    </span>
                  </div>
                ) : (
                  <img
                    src={viewRecord.previewUrl || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80'}
                    alt={viewRecord.documentName}
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease'
                    }}
                    className="max-h-[300px] object-contain rounded-xl shadow-lg"
                  />
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setViewRecord(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(viewRecord)}
                  disabled={isDownloading}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> {isDownloading ? 'Downloading...' : 'Download'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShareRecord(viewRecord);
                    setViewRecord(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-xs border border-teal-200 flex items-center gap-1.5"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteRecord(viewRecord)}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Share Document to Booking Dialog */}
      {shareRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 text-teal-700">
                <Share2 className="w-5 h-5 text-teal-600" /> Share Medical Record
              </h3>
              <button onClick={() => setShareRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Attach <strong className="text-slate-800">{shareRecord.documentName}</strong> directly to an existing or new healthcare service booking:
            </p>

            <div className="space-y-2 text-xs font-bold">
              <button
                onClick={() => handleConfirmShare('pharmacy')}
                className="w-full p-4 rounded-2xl border border-slate-200 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="text-amber-800 text-sm font-extrabold block">💊 Pharmacy Order</span>
                  <span className="text-slate-500 font-normal">Attach prescription to medicine order</span>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => handleConfirmShare('diagnostic')}
                className="w-full p-4 rounded-2xl border border-slate-200 hover:border-fuchsia-400 bg-fuchsia-50/40 hover:bg-fuchsia-50 text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <span className="text-fuchsia-800 text-sm font-extrabold block">🧪 Diagnostic Laboratory</span>
                  <span className="text-slate-500 font-normal">Attach prescription / doctor advise to lab test</span>
                </div>
                <ArrowRight className="w-4 h-4 text-fuchsia-600 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShareRecord(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5 text-rose-600" /> Delete Medical Record?
              </h3>
              <button onClick={() => setDeleteRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-semibold">
              Are you sure you want to delete <strong className="text-slate-800">{deleteRecord.documentName}</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteRecord(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
