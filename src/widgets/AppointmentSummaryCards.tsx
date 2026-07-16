import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, DollarSign, Star } from 'lucide-react';
import { MOCK_APPOINTMENTS, MOCK_REVENUE_BY_CLINIC, MOCK_REVIEWS } from '../mocks/doctorFlowMocks';

interface AppointmentSummaryCardsProps {
  selectedClinic: string | null;
}

const AppointmentSummaryCards: React.FC<AppointmentSummaryCardsProps> = ({ selectedClinic }) => {
  const navigate = useNavigate();

  // Filter Today's Appointments (exclude Cancelled to show active ones)
  const todayApps = MOCK_APPOINTMENTS.filter(app => {
    const matchesClinic = !selectedClinic || app.clinicId === selectedClinic;
    return matchesClinic && app.status !== 'Cancelled';
  });

  // Filter Upcoming Appointments
  const upcomingApps = MOCK_APPOINTMENTS.filter(app => {
    const matchesClinic = !selectedClinic || app.clinicId === selectedClinic;
    return matchesClinic && ['Upcoming', 'Confirmed', 'Pending'].includes(app.status);
  });

  // Get Revenue
  const clinicKey = selectedClinic || 'all';
  const revenueData = MOCK_REVENUE_BY_CLINIC[clinicKey] || MOCK_REVENUE_BY_CLINIC.all;
  const totalRevenue = revenueData.totalRevenue;

  // Calculate Average Rating dynamically
  const clinicReviews = selectedClinic
    ? MOCK_REVIEWS.filter(r => r.clinicId === selectedClinic)
    : MOCK_REVIEWS;
  const avgRating = clinicReviews.length > 0
    ? (clinicReviews.reduce((sum, r) => sum + r.rating, 0) / clinicReviews.length).toFixed(1)
    : '4.8';

  const cards = [
    {
      label: "Today's Appointments",
      value: todayApps.length.toString(),
      icon: Calendar,
      iconBg: 'bg-[#FAF5FF]',
      iconColor: 'text-[#5C2494]',
      link: 'View all →',
      linkColor: 'text-[#5C2494]',
      glowClass: 'card-glow-secondary',
      onClick: () => navigate('/appointments?date=today'),
    },
    {
      label: 'Upcoming Appointments',
      value: upcomingApps.length.toString(),
      icon: Clock,
      iconBg: 'bg-[#FEF3C7]/40',
      iconColor: 'text-[#FBBF24]',
      link: 'View all →',
      linkColor: 'text-[#FBBF24]',
      glowClass: 'card-glow-amber',
      onClick: () => navigate('/appointments?status=upcoming'),
    },
    {
      label: 'Revenue (Current Month)',
      value: `₹${totalRevenue.toLocaleString('en-IN')}`,
      icon: DollarSign,
      iconBg: 'bg-[#FAF5FF]',
      iconColor: 'text-[#D97706]',
      link: 'View details →',
      linkColor: 'text-[#D97706]',
      glowClass: 'card-glow-amber',
      onClick: () => navigate('/revenue?period=current_month'),
    },
    {
      label: 'Average Rating',
      value: `${avgRating}/5`,
      icon: Star,
      iconBg: 'bg-[#FEF3C7]/40',
      iconColor: 'text-amber-500',
      link: 'View all reviews →',
      linkColor: 'text-amber-500',
      glowClass: 'card-glow-amber',
      onClick: () => navigate('/reviews?sort=latest'),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            onClick={card.onClick}
            className={`glass-panel hover-grow ${card.glowClass} p-5 cursor-pointer group flex flex-col justify-between`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-11 h-11 ${card.iconBg} rounded-xl flex items-center justify-center shrink-0 shadow-inner`}>
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-500 leading-tight tracking-wider uppercase">{card.label}</p>
                <h4 className="text-2xl font-black text-slate-800 mt-1.5 leading-none tracking-tight">{card.value}</h4>
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-[11px] font-black uppercase tracking-wider ${card.linkColor} group-hover:translate-x-1 transition-transform inline-flex items-center gap-1`}>
                {card.link}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AppointmentSummaryCards;
