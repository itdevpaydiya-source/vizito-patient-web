import React, { useState } from 'react';
import { Search, Star, MapPin, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { type ProviderItem, type HealthcareServiceOption, MOCK_UNIVERSAL_PROVIDERS } from '../../../../mocks/universalBookingMocks';

interface ProviderSelectorStepProps {
  service: HealthcareServiceOption;
  selectedProvider?: ProviderItem | null;
  onSelectProvider: (provider: ProviderItem) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ProviderSelectorStep: React.FC<ProviderSelectorStepProps> = ({
  service,
  selectedProvider,
  onSelectProvider,
  onNext,
  onBack
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter providers for selected service
  const serviceProviders = MOCK_UNIVERSAL_PROVIDERS.filter(
    (p) => p.serviceId === service.id
  );

  const filteredProviders = serviceProviders.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.subtitle && p.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-teal-600 font-bold text-xs uppercase tracking-wider">
            Step 2 — Choose Provider
          </span>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mt-0.5">
            <span>{service.emoji}</span> Select Provider for {service.name}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Choose a verified provider, hospital, or dispatch unit.
          </p>
        </div>

        <button
          onClick={onBack}
          className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Change Service
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${service.name} providers by name, location, or specialty...`}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-medium text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-xs"
        />
      </div>

      {/* Providers Grid */}
      {filteredProviders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredProviders.map((provider) => {
            const isSelected = selectedProvider?.id === provider.id;

            return (
              <div
                key={provider.id}
                onClick={() => onSelectProvider(provider)}
                className={`bg-white rounded-2xl border p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 group relative ${
                  isSelected
                    ? 'border-teal-600 ring-2 ring-teal-600/20 shadow-md bg-teal-50/10'
                    : 'border-slate-200 hover:border-teal-300 hover:shadow-sm'
                }`}
              >
                {provider.badge && (
                  <span className="absolute top-4 right-4 bg-teal-50 text-teal-700 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-teal-100">
                    {provider.badge}
                  </span>
                )}

                <div>
                  <div className="flex items-start gap-4">
                    <img
                      src={provider.imageUrl}
                      alt={provider.name}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-100 shadow-xs shrink-0"
                    />
                    <div className="min-w-0 flex-1 pr-12">
                      <h3 className="font-extrabold text-slate-800 text-lg group-hover:text-teal-700 transition-colors truncate">
                        {provider.name}
                      </h3>
                      {provider.subtitle && (
                        <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                          {provider.subtitle}
                        </p>
                      )}

                      <div className="flex items-center gap-1 mt-2">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-black text-slate-800">{provider.rating}</span>
                        <span className="text-xs text-slate-400 font-medium">({provider.reviewsCount} reviews)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600 font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{provider.location}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pricing / Fee</span>
                    <p className="font-black text-slate-800 text-base">{provider.feeOrPrice}</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProvider(provider);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Selected
                      </>
                    ) : (
                      'Select Provider'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 py-12 text-center">
          <p className="text-slate-500 font-medium text-sm">No providers match your search query.</p>
        </div>
      )}

      {/* Bottom Bar Action */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Back
        </button>

        <button
          onClick={onNext}
          disabled={!selectedProvider}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-xs ${
            selectedProvider
              ? 'bg-teal-600 hover:bg-teal-700 text-white active:scale-98'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Select Patient &rarr;
        </button>
      </div>
    </div>
  );
};
