import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  LifeBuoy,
  Search,
  MessageCircle,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  FileText,
  Send
} from 'lucide-react';

const FAQS = [
  {
    question: 'How do I update my bank details for settlements?',
    answer: 'You can update your bank details in the Settings > Financials section. Note that any changes to your bank account will require a new KYC verification cycle which usually takes 24-48 hours.'
  },
  {
    question: 'How are online consultation fees processed?',
    answer: 'Online consultation fees are held in escrow until the appointment is marked as completed. Once completed, the funds (minus platform commission) are transferred to your linked bank account during the next settlement cycle.'
  },
  {
    question: 'Can I reschedule a confirmed appointment?',
    answer: 'Yes, you can reschedule an appointment up to 2 hours before the scheduled time. Navigate to the Appointment Management module, select the appointment, and click "Reschedule". The patient will be notified automatically.'
  },
  {
    question: 'What happens if a patient misses an online consultation?',
    answer: 'If a patient does not join the online consultation room within 15 minutes of the scheduled time, you can mark the appointment as a "No-Show". The consultation fee will still be credited to your account according to our cancellation policy.'
  }
];

export default function HelpSupportScreen() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [ticketSent, setTicketSent] = useState(false);
  const ticketFormik = useFormik({
    initialValues: { subject: '', message: '' },
    validationSchema: Yup.object({
      subject: Yup.string().required('Subject is required'),
      message: Yup.string().required('Message is required'),
    }),
    onSubmit: (_values, { resetForm }) => {
      setTicketSent(true);
      resetForm();
      setTimeout(() => setTicketSent(false), 5000);
    }
  });

  return (
    <div className="w-full animate-fade space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <LifeBuoy className="w-8 h-8 text-teal-600" />
          Help & Support
        </h1>
        <p className="text-slate-500 font-medium mt-2">
          Find answers in our knowledge base or contact our enterprise support team.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: FAQs & Search */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Bar */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60 flex items-center gap-3 focus-within:ring-4 focus-within:ring-teal-500/10 focus-within:border-teal-400 transition-all">
            <div className="pl-3">
              <Search className="w-5 h-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search for answers, articles, or topics..."
              className="w-full bg-transparent border-none focus:outline-none text-slate-700 py-2 placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* FAQ Accordion */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-500" />
                Frequently Asked Questions
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {FAQS.map((faq, index) => (
                <div key={index} className="group">
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span className={`font-semibold pr-4 ${openFaq === index ? 'text-teal-700' : 'text-slate-700 group-hover:text-teal-600'}`}>
                      {faq.question}
                    </span>
                    {openFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-teal-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-6 text-sm text-slate-600 leading-relaxed animate-fade">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Contact & Ticket */}
        <div className="space-y-6">

          {/* Quick Contact Cards */}
          <div className="bg-gradient-to-br from-teal-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg shadow-teal-600/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <MessageCircle className="w-32 h-32" />
            </div>

            <h2 className="text-lg font-bold mb-4 relative z-10">Need Immediate Help?</h2>

            <div className="space-y-4 relative z-10">
              <div className="flex items-start gap-4 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors cursor-pointer">
                <div className="p-2 bg-white/20 rounded-lg shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-teal-100 font-semibold uppercase tracking-wider">Priority Support Line</p>
                  <p className="font-bold">1800-VIZITO-PRO</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors cursor-pointer">
                <div className="p-2 bg-white/20 rounded-lg shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-teal-100 font-semibold uppercase tracking-wider">Email Us</p>
                  <p className="font-bold">support@vizito.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit a Ticket */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Submit a Ticket</h2>

            {ticketSent ? (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Send className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-emerald-800">Ticket Submitted!</h3>
                <p className="text-xs text-emerald-600 mt-1">Our team will get back to you within 4 hours.</p>
              </div>
            ) : (
              <form onSubmit={ticketFormik.handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    required
                    value={ticketFormik.values.subject}
                    onChange={ticketFormik.handleChange}
                    placeholder="Brief description of the issue"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message</label>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    value={ticketFormik.values.message}
                    onChange={ticketFormik.handleChange}
                    placeholder="Provide details about the issue..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-sm resize-none custom-scrollbar"
                  ></textarea>
                </div>
                <button type="submit" className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors shadow-md flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send Ticket
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
