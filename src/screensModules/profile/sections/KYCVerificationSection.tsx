import { UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';

const KYCVerificationSection = () => {
  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start sm:items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">KYC & Verification</h3>
          <p className="text-sm text-slate-500 mt-1">Upload required documents to unlock settlements.</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200/50">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-bold text-amber-700">Pending Review</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[
          { name: 'Aadhaar Card', status: 'Uploaded' },
          { name: 'PAN Card', status: 'Uploaded' },
          { name: 'Medical Registration Certificate', status: 'Missing' },
          { name: 'Qualification Certificates', status: 'Missing' },
        ].map((doc, idx) => (
          <div key={idx} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between group hover:border-teal-300 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                doc.status === 'Uploaded' ? 'bg-emerald-50' : 'bg-slate-50'
              }`}>
                {doc.status === 'Uploaded' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <UploadCloud className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">{doc.name}</h4>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                  doc.status === 'Uploaded' ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {doc.status}
                </span>
              </div>
            </div>
            
            <button className="text-sm font-semibold text-teal-600 hover:text-teal-700">
              {doc.status === 'Uploaded' ? 'Replace' : 'Upload'}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
        <button className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors">
          Submit for Verification
        </button>
      </div>
    </div>
  );
};

export default KYCVerificationSection;
