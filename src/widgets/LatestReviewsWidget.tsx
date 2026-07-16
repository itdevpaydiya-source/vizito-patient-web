import React from 'react';
import { MOCK_REVIEWS } from '../mocks/doctorFlowMocks';
import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LatestReviewsWidgetProps {
  selectedClinic: string | null;
}

const LatestReviewsWidget: React.FC<LatestReviewsWidgetProps> = ({ selectedClinic }) => {
  const navigate = useNavigate();

  // Filter reviews by selected clinic
  const filteredReviews = MOCK_REVIEWS.filter(r => !selectedClinic || r.clinicId === selectedClinic);
  const displayReviews = filteredReviews.slice(0, 5);

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = rating >= i;
          const half = !filled && rating >= i - 0.5;
          return (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${filled || half ? 'text-[#D97706] fill-[#D97706]' : 'text-slate-200 fill-slate-200'}`}
            />
          );
        })}
        <span className="text-[11px] font-bold text-slate-700 ml-1">{rating}</span>
      </div>
    );
  };

  const handleWidgetClick = () => {
    navigate('/reviews?sort=latest');
  };

  const isEmpty = displayReviews.length === 0;

  return (
    <div className="glass-panel overflow-hidden flex flex-col h-full hover-grow card-glow-amber">
      {/* Header (Entire widget clickable to Reviews & Ratings -> Latest Reviews) */}
      <div 
        onClick={handleWidgetClick}
        className="px-5 py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50/60 transition-all group"
      >
        <h3 className="text-base font-bold text-[#2B2B2B] group-hover:text-[#5C2494] transition-colors">
          Latest Reviews
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/reviews?sort=latest');
          }}
          className="text-xs font-bold text-[#5C2494] hover:text-[#7C3AED] transition-colors"
        >
          View all
        </button>
      </div>

      {/* Reviews List / Empty State */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[300px] flex flex-col justify-between">
        {isEmpty ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <Star className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No reviews available.</p>
          </div>
        ) : (
          /* Reviews List */
          <div className="divide-y divide-slate-100 flex-1">
            {displayReviews.map(review => (
              <div 
                key={review.id} 
                onClick={handleWidgetClick}
                className="px-5 py-3.5 hover:bg-slate-50/40 border-l-2 border-transparent hover:border-l-[#7C3AED] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${review.color}`}>
                    {review.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-sm font-bold text-slate-800">{review.patientName}</span>
                        <div className="mt-0.5">{renderStars(review.rating)}</div>
                      </div>
                      <span className="text-[11px] text-slate-400 font-semibold shrink-0 mt-0.5">{review.date}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{review.comment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LatestReviewsWidget;
