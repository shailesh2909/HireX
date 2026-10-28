import React, { useMemo, useState } from 'react';
import { ShieldCheck, MapPin, CheckCircle2 } from 'lucide-react';
import { searchDiscover, addDiscoverToNetwork } from '../utils/appData';
import DashboardNavbar from '../components/DashboardNavbar';
import { NetworkCardSkeleton } from '../components/Skeleton';
import { useEffect } from 'react';

function ResultCard({ item, onViewProfile }) {
  return (
    <article className="rounded-2xl border border-[rgba(91,97,110,0.18)] bg-white p-5 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0a0b0d]">{item.name}</p>
          <p className="text-xs text-[#5b616e]">{item.title}</p>
        </div>
        <span className="rounded-sm bg-[#eef0f3] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0a0b0d]">{item.tag}</span>
      </div>
      <p className="mt-3 text-sm leading-[1.55] text-[#0a0b0d]">{item.detail}</p>
      <button type="button" onClick={() => onViewProfile(item)} className="mt-4 inline-flex items-center gap-2 rounded-sm bg-[#0052ff] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#0046d8]">
        View profile
      </button>
    </article>
  );
}

export default function Discover() {
  const [query, setQuery] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [sentRequests, setSentRequests] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const results = useMemo(() => searchDiscover(query), [query]);

  function handleSendRequest(profile) {
    const success = addDiscoverToNetwork(profile.id);
    if (success) {
      setSentRequests(prev => ({ ...prev, [profile.id]: true }));
      // Optionally close the preview after a short delay
      setTimeout(() => {
        setSelectedProfile(null);
      }, 1500);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eaf0ff_0%,#f5f7fb_45%,#f5f7fb_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1240px] space-y-6">
        <DashboardNavbar activePath="/discover" />

        <header className="rounded-2xl border border-[rgba(91,97,110,0.18)] bg-white px-6 py-5 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b616e]">Discover</p>
          <h1 className="mt-2 text-[36px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0a0b0d]">Search verified people and businesses</h1>
          <p className="mt-3 max-w-[760px] text-[16px] leading-[1.6] text-[#5b616e]">Find trusted professionals, founders, and companies matching your goals.</p>
        </header>

        <div className="rounded-2xl border border-[rgba(91,97,110,0.18)] bg-white p-5 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, skill, company, or role" className="w-full rounded-sm border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none focus:border-[#0052ff]" />
            <button type="button" className="rounded-sm bg-[#0a0b0d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#000]">{results.length} results</button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <>
              <NetworkCardSkeleton />
              <NetworkCardSkeleton />
              <NetworkCardSkeleton />
            </>
          ) : (
            results.map((item) => (
              <ResultCard key={item.id} item={item} onViewProfile={setSelectedProfile} />
            ))
          )}
        </div>

        {selectedProfile && (
          <div className="animate-in fade-in slide-in-from-bottom-4 mt-8 rounded-2xl border border-[#e2e8f0] bg-[#fafbfd] p-8 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5b616e]">Profile Preview</span>
              <button 
                onClick={() => setSelectedProfile(null)} 
                className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#0a0b0d] transition-colors hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
              <div className="flex h-[100px] w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
                {selectedProfile.tag?.toLowerCase() === 'company' ? (
                  <div className="flex h-full w-full items-center justify-center bg-[#0a0b0d] text-[32px] font-bold text-white">
                    {selectedProfile.name.charAt(0)}
                  </div>
                ) : (
                  <img src={`https://i.pravatar.cc/150?u=${selectedProfile.id || selectedProfile.name}`} alt={selectedProfile.name} className="h-full w-full object-cover" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[28px] font-bold tracking-tight text-[#0a0b0d]">{selectedProfile.name}</h2>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#0052ff]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#0052ff]">
                    <ShieldCheck size={14} /> Verified
                  </span>
                  <span className="inline-flex items-center rounded-lg bg-[#eef0f3] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#5b616e]">
                    {selectedProfile.tag || 'People'}
                  </span>
                </div>
                
                <p className="mt-2 text-[16px] font-medium text-[#5b616e]">
                  {selectedProfile.title}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[15px] font-medium text-[#5b616e]">
                  <MapPin size={16} /> {selectedProfile.location || 'Bengaluru, India'}
                </div>

                <div className="mt-6">
                  <p className="text-[17px] leading-[1.6] text-[#0a0b0d]">{selectedProfile.detail}</p>
                </div>

                <div className="mt-8 flex items-center gap-3">
                  {sentRequests[selectedProfile.id] ? (
                    <div className="flex items-center gap-2 rounded-xl bg-[#10B981]/10 px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-[#10B981]">
                      <CheckCircle2 size={16} /> Request Sent
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(selectedProfile)}
                      className="rounded-xl bg-[#0052ff] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#0046d8]"
                    >
                      Send Request
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
