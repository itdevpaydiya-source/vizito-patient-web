import React, { useState } from 'react';
import { 
  Star, Search, Filter, ChevronDown, CheckCircle2, MapPin, 
  Video, CalendarClock, MessageSquare, Info, MoreVertical,
  ChevronLeft, ChevronRight, User, Share2, TrendingUp
} from 'lucide-react';

const MOCK_REVIEWS = [
  {
    id: 1,
    patient: 'Amit Verma',
    verified: true,
    rating: 5.0,
    date: '31 May 2025, 10:30 AM',
    text: 'Excellent doctor! Very friendly and explained everything in detail. The consultation was very helpful.',
    type: 'In-Clinic Consultation',
    typeIcon: CalendarClock,
    location: 'VIZITO Health Clinic, Banjara Hills',
    status: 'Responded',
    avatar: 'https://i.pravatar.cc/150?u=amit'
  },
  {
    id: 2,
    patient: 'Priya Singh',
    verified: true,
    rating: 4.0,
    date: '30 May 2025, 04:15 PM',
    text: 'Good experience overall. Wait time was less and staff was cooperative.',
    type: 'Video Consultation',
    typeIcon: Video,
    location: 'Online',
    status: 'Responded',
    avatar: 'https://i.pravatar.cc/150?u=priya'
  },
  {
    id: 3,
    patient: 'Rajesh Kumar',
    verified: true,
    rating: 5.0,
    date: '29 May 2025, 11:20 AM',
    text: 'Very professional and polite. Got the right diagnosis and treatment.',
    type: 'In-Clinic Consultation',
    typeIcon: CalendarClock,
    location: 'VIZITO Health Clinic, Banjara Hills',
    status: 'Responded',
    avatar: 'https://i.pravatar.cc/150?u=rajesh'
  },
  {
    id: 4,
    patient: 'Neha Patel',
    verified: false,
    rating: 3.0,
    date: '28 May 2025, 02:45 PM',
    text: 'Doctor is good but the clinic location is a bit crowded.',
    type: 'In-Clinic Consultation',
    typeIcon: CalendarClock,
    location: 'VIZITO Health Clinic, Kukatpally',
    status: 'Pending',
    avatar: 'https://i.pravatar.cc/150?u=neha'
  },
  {
    id: 5,
    patient: 'Sandeep Reddy',
    verified: true,
    rating: 5.0,
    date: '27 May 2025, 09:10 AM',
    text: 'Highly recommended! Best cardiologist I have consulted.',
    type: 'Video Consultation',
    typeIcon: Video,
    location: 'Online',
    status: 'Responded',
    avatar: 'https://i.pravatar.cc/150?u=sandeep'
  }
];
export default function ReviewsScreen() {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedRating, setSelectedRating] = useState('All');
  const [selectedDateRange, setSelectedDateRange] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const handleResetFilters = () => {
    setSelectedLocation('All');
    setSelectedType('All');
    setSelectedRating('All');
    setSelectedDateRange('All');
    setSearchQuery('');
  };

  const locations = Array.from(new Set(MOCK_REVIEWS.map(r => r.location)));
  const types = Array.from(new Set(MOCK_REVIEWS.map(r => r.type)));

  const dropdownFiltered = MOCK_REVIEWS.filter(review => {
    if (selectedLocation !== 'All' && review.location !== selectedLocation) return false;
    if (selectedType !== 'All' && review.type !== selectedType) return false;
    if (selectedRating !== 'All') {
      const rat = Math.floor(review.rating);
      if (selectedRating === '5' && rat !== 5) return false;
      if (selectedRating === '4' && rat !== 4) return false;
      if (selectedRating === '3' && rat > 3) return false;
    }
    if (selectedDateRange !== 'All') {
      const day = parseInt(review.date.split(' ')[0]);
      if (selectedDateRange === 'current') {
        if (day < 26) return false;
      } else if (selectedDateRange === 'previous') {
        if (day < 19 || day > 25) return false;
      }
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchPatient = review.patient.toLowerCase().includes(q);
      const matchText = review.text.toLowerCase().includes(q);
      if (!matchPatient && !matchText) return false;
    }
    return true;
  });

  const allCount = dropdownFiltered.length;
  const respondedCount = dropdownFiltered.filter(r => r.status === 'Responded').length;
  const pendingCount = dropdownFiltered.filter(r => r.status === 'Pending').length;

  const filteredReviews = dropdownFiltered.filter(review => {
    if (activeTab === 'responded' && review.status !== 'Responded') return false;
    if (activeTab === 'pending' && review.status !== 'Pending') return false;
    return true;
  });

  return (
    <div className="w-full animate-fade space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800">Reviews & Ratings</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">View and manage patient reviews and ratings.</p>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Location</label>
            <div className="relative">
              <select 
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className="appearance-none w-full border border-slate-200 rounded-xl bg-white h-10 pl-3 pr-8 text-sm font-bold text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none min-w-[160px]"
              >
                <option value="All">All Locations</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Consultation Type</label>
            <div className="relative">
              <select 
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="appearance-none w-full border border-slate-200 rounded-xl bg-white h-10 pl-3 pr-8 text-sm font-bold text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none min-w-[160px]"
              >
                <option value="All">All Types</option>
                {types.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rating</label>
            <div className="relative">
              <select 
                value={selectedRating}
                onChange={e => setSelectedRating(e.target.value)}
                className="appearance-none w-full border border-slate-200 rounded-xl bg-white h-10 pl-3 pr-8 text-sm font-bold text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none min-w-[140px]"
              >
                <option value="All">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars & Below</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Date Range</label>
            <div className="relative">
              <select 
                value={selectedDateRange}
                onChange={e => setSelectedDateRange(e.target.value)}
                className="appearance-none w-full border border-slate-200 rounded-xl bg-white h-10 pl-9 pr-8 text-sm font-bold text-slate-700 cursor-pointer hover:border-slate-300 focus:outline-none min-w-[220px]"
              >
                <option value="All">All Dates</option>
                <option value="current">26 May 2025 - 01 Jun 2025</option>
                <option value="previous">19 May 2025 - 25 May 2025</option>
              </select>
              <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex items-end gap-3 shrink-0">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reviews..." 
              className="w-full pl-9 pr-4 h-10 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-teal-400"
            />
          </div>
          <button 
            onClick={handleResetFilters}
            className={`flex items-center justify-center gap-2 h-10 px-4 border rounded-xl text-sm font-bold transition-colors cursor-pointer ${
              (selectedLocation !== 'All' || selectedType !== 'All' || selectedRating !== 'All' || selectedDateRange !== 'All' || searchQuery !== '')
                ? 'bg-teal-50 border-teal-200 text-teal-600 hover:bg-teal-100/70'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Clear all filters"
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Average Rating */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-xs font-bold text-slate-500 mb-1">Average Rating</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-slate-800 leading-none">4.8</span>
            <div className="flex items-center gap-0.5 mb-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
              ))}
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-2">Based on 248 reviews</p>
        </div>

        {/* Total Reviews */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">Total Reviews</p>
            <p className="text-2xl font-black text-slate-800 leading-tight">248</p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">All time reviews</p>
          </div>
        </div>

        {/* 5 Star Reviews */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 text-emerald-500 fill-emerald-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">5 Star Reviews</p>
            <p className="text-xl font-black text-slate-800 leading-tight">
              198 <span className="text-sm font-bold text-slate-500">(79.8%)</span>
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Excellent</p>
          </div>
        </div>

        {/* 4 Star Reviews */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">4 Star Reviews</p>
            <p className="text-xl font-black text-slate-800 leading-tight">
              36 <span className="text-sm font-bold text-slate-500">(14.5%)</span>
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Good</p>
          </div>
        </div>

        {/* 3 Star & Below */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#FAF5FF] rounded-full flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 text-[#D97706] fill-[#D97706]" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">3 Star & Below</p>
            <p className="text-xl font-black text-slate-800 leading-tight">
              14 <span className="text-sm font-bold text-slate-500">(5.6%)</span>
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Needs Improvement</p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column: Reviews List */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl flex flex-col">
          {/* Tabs & Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 pt-4 border-b border-slate-100">
            <div className="flex items-center gap-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              <button 
                onClick={() => setActiveTab('all')}
                className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'all' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                All Reviews ({allCount})
              </button>
              <button 
                onClick={() => setActiveTab('responded')}
                className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'responded' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Responded ({respondedCount})
              </button>
              <button 
                onClick={() => setActiveTab('pending')}
                className={`pb-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'pending' ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Pending ({pendingCount})
              </button>
            </div>
            <div className="relative pb-4 sm:pb-0 sm:mb-4">
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-slate-50">
                <span className="text-xs font-bold text-slate-700">Most Recent</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div className="divide-y divide-slate-100 flex-1">
            {filteredReviews.map(review => {
              const TypeIcon = review.typeIcon;
              return (
                <div key={review.id} className="p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 hover:bg-slate-50/50 transition-colors">
                  
                  {/* Left: Avatar & Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-3">
                      <img src={review.avatar} alt={review.patient} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-extrabold text-slate-800">{review.patient}</h4>
                          {review.verified && <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />}
                        </div>
                        <p className="text-xs text-slate-400 font-medium">{review.date}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.floor(review.rating) ? 'text-amber-500 fill-amber-500' : 'text-slate-200 fill-slate-200'}`} />
                        ))}
                      </div>
                      <span className="text-xs font-black text-slate-700">{review.rating.toFixed(1)}</span>
                    </div>
                    
                    <p className="text-sm text-slate-700 font-medium mb-3 pr-4 leading-relaxed">
                      {review.text}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-md">
                        <TypeIcon className="w-3 h-3" /> {review.type}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md">
                        <MapPin className="w-3 h-3" /> {review.location}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-4 shrink-0 sm:w-32 border-t sm:border-t-0 pt-4 sm:pt-0">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                      review.status === 'Responded' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-[#FAF5FF] text-[#D97706] border-amber-200'
                    }`}>
                      {review.status}
                    </span>
                    <div className="flex items-center gap-2">
                      <button className={`text-xs font-bold border px-3 py-1.5 rounded-lg transition-colors ${
                        review.status === 'Responded' 
                          ? 'border-slate-200 text-slate-600 hover:bg-slate-100' 
                          : 'border-teal-600 text-teal-700 hover:bg-teal-50'
                      }`}>
                        {review.status === 'Responded' ? 'View Response' : 'Respond'}
                      </button>
                      <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              )
            })}
            {filteredReviews.length === 0 && (
              <div className="p-12 text-center text-sm font-semibold text-slate-400">
                No reviews match the selected filters.
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-bold text-slate-500">Showing 1 to {filteredReviews.length} of {filteredReviews.length} reviews</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-teal-50 text-teal-700 font-bold">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 font-bold">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 font-bold">3</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 font-bold">4</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 font-bold">5</button>
                <span className="text-slate-400 mx-1">...</span>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 font-bold">50</button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer">
                <span className="text-xs font-bold text-slate-700">10 / page</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="space-y-6">
          
          {/* Rating Distribution */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-5">Rating Distribution</h3>
            <div className="space-y-3">
              {[
                { stars: 5, color: 'bg-emerald-500', pct: 79.8, count: 198 },
                { stars: 4, color: 'bg-green-400', pct: 14.5, count: 36 },
                { stars: 3, color: 'bg-yellow-400', pct: 3.2, count: 8 },
                { stars: 2, color: 'bg-orange-400', pct: 1.6, count: 4 },
                { stars: 1, color: 'bg-red-500', pct: 0.8, count: 2 },
              ].map(row => (
                <div key={row.stars} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-600 w-12 shrink-0">{row.stars} Star</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${row.color} rounded-full`} style={{ width: `${row.pct}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 w-16 text-right">
                    {row.count} ({row.pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                  <span className="text-xs font-bold text-slate-700 group-hover:text-teal-700 transition-colors">View Public Profile</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600" />
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <Share2 className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors" />
                  <span className="text-xs font-bold text-slate-700 group-hover:text-teal-700 transition-colors">Share Review Link</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600" />
              </button>
            </div>
          </div>

          {/* Review Insights */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-5">Review Insights</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Response Rate</p>
                <p className="text-xl font-black text-slate-800">75%</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avg. Response Time</p>
                <p className="text-xl font-black text-slate-800">12h 30m</p>
              </div>
            </div>
            
            <div className="flex items-end justify-between border-t border-slate-100 pt-4 mt-2">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Views</p>
                <p className="text-xl font-black text-slate-800">1,248</p>
              </div>
              {/* Fake mini sparkline chart */}
              <div className="h-10 w-24 flex items-end justify-between gap-1">
                {[4, 6, 3, 7, 5, 8, 10].map((h, i) => (
                  <div key={i} className="w-full bg-emerald-100 rounded-t-sm" style={{ height: `${h * 10}%` }}>
                    <div className="w-full bg-emerald-500 rounded-t-sm" style={{ height: '2px' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-1">Note</h4>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                Timely responses to reviews build trust and improve your rating.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
