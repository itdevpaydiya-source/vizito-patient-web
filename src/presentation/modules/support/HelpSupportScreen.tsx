import React, { useState } from 'react';
import {
  LifeBuoy,
  Search,
  MessageSquare,
  Mail,
  Phone,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Send,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Paperclip,
  X,
  ArrowRight,
  ShieldCheck,
  Headphones
} from 'lucide-react';

export interface FAQItem {
  question: string;
  answer: string;
  category: 'Booking' | 'Records' | 'Family' | 'Tracking' | 'Payments';
}

export const PATIENT_FAQS: FAQItem[] = [
  {
    question: 'How do I book a healthcare service or doctor appointment?',
    answer:
      'Navigate to Healthcare Services or click "Book Service" in the sidebar. Select your desired service (Doctor, Hospital, Home Care, Ambulance, Pharmacy, Diagnostic Lab, or Equipment Rental), choose your provider, select date/time, and complete payment.',
    category: 'Booking'
  },
  {
    question: 'How do I cancel a booking and receive a refund?',
    answer:
      'Go to the Bookings module in the sidebar, select your active or upcoming booking card, click "Cancel Booking", select your reason for cancellation, and confirm. Eligible refunds are processed back to your payment method automatically.',
    category: 'Booking'
  },
  {
    question: 'How do I upload and manage medical records for my family?',
    answer:
      'Open the Medical Records module. Use the patient profile dropdown at the top to select yourself or a family member, click "+ Upload Record", select the file (PDF, JPG, PNG), enter a name, and save. Records can also be shared directly during Pharmacy or Lab test bookings.',
    category: 'Records'
  },
  {
    question: 'How do I add a new family member for bookings?',
    answer:
      'Navigate to Profile & Account > Family Members and click "+ Add Family Member". Enter their full name, date of birth, gender, and relationship (Father, Mother, Spouse, Child, etc.). Their profile will now be selectable during any healthcare booking.',
    category: 'Family'
  },
  {
    question: 'How does live queue token tracking and GPS dispatch work?',
    answer:
      'For Doctor, Hospital, and Lab bookings, your live Queue Token number, patients ahead, and estimated wait time update automatically on your Booking Details card. For Home Care, Ambulance, Pharmacy, and Equipment rentals, real-time GPS tracking displays live dispatch progress.',
    category: 'Tracking'
  },
  {
    question: 'What payment methods are supported on Vizito?',
    answer:
      'Vizito supports UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards, Net Banking, and Wallet payments. Digital tax invoices and receipts are issued immediately after booking.',
    category: 'Payments'
  }
];

export default function HelpSupportScreen() {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Modals & Toast State
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State - Contact Support
  const [contactSubject, setContactSubject] = useState('');
  const [contactCategory, setContactCategory] = useState('Booking Issue');
  const [contactMessage, setContactMessage] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);

  // Form State - Report an Issue
  const [reportTitle, setReportTitle] = useState('');
  const [reportCategory, setReportCategory] = useState('Booking');
  const [reportDesc, setReportDesc] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filter FAQs based on search
  const filteredFaqs = PATIENT_FAQS.filter(
    (faq) =>
      !searchTerm ||
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Contact Form Submit
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);

    if (!contactSubject.trim()) {
      setContactError('Subject is required.');
      return;
    }
    if (!contactCategory) {
      setContactError('Please select a category.');
      return;
    }
    if (!contactMessage.trim()) {
      setContactError('Message cannot be empty.');
      return;
    }

    setContactModalOpen(false);
    setContactSubject('');
    setContactMessage('');
    showToast('Your support request has been submitted successfully. Our support team will contact you shortly.');
  };

  // Report Issue Form Submit
  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReportError(null);

    if (!reportTitle.trim()) {
      setReportError('Issue Title is required.');
      return;
    }
    if (!reportDesc.trim()) {
      setReportError('Please provide an issue description.');
      return;
    }

    // Validate attachment format if provided
    if (reportFile) {
      const ext = reportFile.name.split('.').pop()?.toLowerCase();
      if (!['png', 'jpg', 'jpeg', 'pdf'].includes(ext || '')) {
        setReportError('Unsupported file format. Please attach PNG, JPG, JPEG, or PDF.');
        return;
      }
    }

    const ticketId = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    setReportModalOpen(false);
    setReportTitle('');
    setReportDesc('');
    setReportFile(null);
    showToast(`Issue report submitted successfully. Ticket reference #${ticketId} generated.`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 max-w-5xl mx-auto">
      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 max-w-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold leading-relaxed">{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-teal-200">
            <Headphones className="w-3.5 h-3.5 text-teal-300" />
            Patient Help & Customer Care
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Help & Support</h1>
          <p className="text-teal-100/80 text-sm sm:text-base font-medium leading-relaxed">
            How can we help you today? Contact customer care, report an application issue, or search our knowledge base.
          </p>

          {/* Search Box */}
          <div className="mt-6 relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search help topics, FAQs, booking guides, or refund rules..."
              className="w-full pl-12 pr-4 py-3.5 bg-white text-slate-900 rounded-2xl font-semibold text-sm placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-400/30 shadow-lg"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Support Options Cards Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <span>🛠️</span> Support Options
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Option 1: Contact Support */}
          <div
            onClick={() => {
              setContactError(null);
              setContactModalOpen(true);
            }}
            className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-3 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base group-hover:text-teal-700 transition-colors">
                Contact Support
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Talk to our customer care team about bookings or payments.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-teal-600 flex items-center justify-between">
              <span>Open Form</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Option 2: Report an Issue */}
          <div
            onClick={() => {
              setReportError(null);
              setReportModalOpen(true);
            }}
            className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-3 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base group-hover:text-rose-700 transition-colors">
                Report an Issue
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Report a technical error or attach payment screenshots.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-rose-600 flex items-center justify-between">
              <span>Submit Ticket</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Option 3: Call Support */}
          <a
            href="tel:+919876543210"
            className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base group-hover:text-emerald-700 transition-colors">
                Call Support
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Speak directly with support specialists on phone.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-emerald-600 flex items-center justify-between">
              <span>+91 98765 43210</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>

          {/* Option 4: Email Support */}
          <a
            href="mailto:support@vizito.com?subject=Patient%20Support%20Request"
            className="bg-white rounded-2xl border border-slate-200 p-5 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-3 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base group-hover:text-sky-700 transition-colors">
                Email Support
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Send an email inquiry for non-urgent assistance.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-sky-600 flex items-center justify-between">
              <span>support@vizito.com</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>
        </div>
      </div>

      {/* Main Content Layout: FAQs + Contact Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: FAQ Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" /> Frequently Asked Questions
            </h2>
            <span className="text-xs font-bold text-slate-400">
              {filteredFaqs.length} Articles Available
            </span>
          </div>

          {filteredFaqs.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {filteredFaqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="transition-colors">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <span className={`text-xs sm:text-sm font-bold pr-4 ${isOpen ? 'text-teal-700' : 'text-slate-800'}`}>
                        {faq.question}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-teal-600 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs text-slate-600 font-medium leading-relaxed bg-slate-50/50 border-t border-slate-100">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State when Search produces no FAQs */
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-sm">No help articles available.</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No FAQs matched your search term. Please contact customer support directly.
              </p>
              <button
                onClick={() => setContactModalOpen(true)}
                className="mt-2 inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md"
              >
                <MessageSquare className="w-4 h-4" /> Contact Customer Support
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Support Contact Information Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" /> Customer Support Info
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Reach out via official channels.</p>
          </div>

          <div className="space-y-4 text-xs font-semibold">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
              <Phone className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Phone Number</span>
                <span className="font-black text-slate-800 text-sm">+91 98765 43210</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
              <Mail className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Address</span>
                <span className="font-black text-slate-800 text-sm">support@vizito.com</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Working Hours</span>
                <span className="font-bold text-slate-800">9:00 AM – 6:00 PM (Mon - Sat)</span>
              </div>
            </div>
          </div>

          {/* Need Immediate Help Box */}
          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-center space-y-2">
            <h4 className="font-extrabold text-teal-900 text-xs">Need Immediate Help?</h4>
            <p className="text-[11px] text-teal-700">Submit a support request and our team will get back to you shortly.</p>
            <button
              onClick={() => {
                setContactError(null);
                setContactModalOpen(true);
              }}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs shadow-md transition-all active:scale-98"
            >
              Contact Us Now
            </button>
          </div>
        </div>

      </div>

      {/* Contact Support Modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 text-teal-700">
                <MessageSquare className="w-5 h-5 text-teal-600" /> Contact Support Form
              </h3>
              <button onClick={() => setContactModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {contactError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{contactError}</span>
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  placeholder="e.g. Unable to book appointment"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={contactCategory}
                  onChange={(e) => setContactCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                >
                  <option value="Booking Issue">Booking Issue</option>
                  <option value="Payment Issue">Payment Issue</option>
                  <option value="Pharmacy">Pharmacy</option>
                  <option value="Laboratory">Laboratory</option>
                  <option value="Home Care">Home Care</option>
                  <option value="Ambulance">Ambulance</option>
                  <option value="Equipment Rental">Equipment Rental</option>
                  <option value="Medical Records">Medical Records</option>
                  <option value="Account">Account</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Message</label>
                <textarea
                  rows={4}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Describe your issue or request in detail..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setContactModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report an Issue Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 text-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5 text-rose-600" /> Report an Application Issue
              </h3>
              <button onClick={() => setReportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reportError}</span>
              </div>
            )}

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Issue Title</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Payment Failed, Screen Freezing"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                >
                  <option value="Booking">Booking</option>
                  <option value="Payment">Payment</option>
                  <option value="Account">Account</option>
                  <option value="Notification">Notification</option>
                  <option value="Medical Records">Medical Records</option>
                  <option value="Technical Issue">Technical Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={4}
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  placeholder="Explain what happened and steps to reproduce..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Attach Screenshot (Optional - PNG, JPG, PDF)</label>
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center justify-between">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                    className="text-xs text-slate-600"
                  />
                  {reportFile && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      ✓ Attached
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
