import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ShieldCheck, MapPin, Globe } from 'lucide-react';
import { isBusinessRole } from '../utils/flowState';
import { getDiscoverList, getMyConnections, connectToUser } from '../utils/api';
import DashboardNavbar from '../components/DashboardNavbar';
import { NetworkCardSkeleton } from '../components/Skeleton';


function PersonCard({ person, actionText, onAction, secondaryActionText, onSecondaryAction }) {
  // Use a deterministic avatar from pravatar for a premium look, falling back to initials if needed
  const avatarUrl = person.photoUrl || `https://i.pravatar.cc/150?u=${person.id}`;
  
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm transition-all hover:shadow-md">
      <div className="relative flex-1 p-6 pb-5">
        <div className="flex items-start justify-between">
          <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#f8fafc] shadow-sm">
            <img src={avatarUrl} alt={person.name} className="h-full w-full object-cover" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0052ff]/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#0052ff]">
            <ShieldCheck size={14} /> Verified
          </span>
        </div>
        
        <div className="mt-4">
          <button 
            onClick={() => onAction('view_profile')}
            className="text-left text-[22px] font-bold leading-[1.2] tracking-tight text-[#0a0b0d] hover:text-[#0052ff]"
          >
            {person.name}
          </button>
          <p className="mt-1 text-[15px] font-medium text-[#5b616e]">{person.role} {person.company ? `at ${person.company}` : ''}</p>
          <p className="mt-0.5 text-[15px] font-medium text-[#5b616e]">{person.location || 'Bengaluru, India'}</p>
        </div>
        
        <p className="mt-4 text-[15px] font-medium leading-[1.5] text-[#0a0b0d] line-clamp-2">
          {person.note}
        </p>
      </div>

      <div className="flex border-t border-[#e2e8f0] bg-[#fafbfd] p-4 gap-3">
        <button 
          type="button" 
          onClick={() => onAction(person)} 
          className="flex-1 rounded-xl bg-white border border-[#0052ff] py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#0052ff] transition-colors hover:bg-[#0052ff] hover:text-white"
        >
          {actionText}
        </button>
        {secondaryActionText && onSecondaryAction && (
          <button 
            type="button" 
            onClick={() => onSecondaryAction(person)} 
            className="rounded-xl bg-white border border-[#e2e8f0] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[#5b616e] transition-colors hover:border-red-500 hover:text-red-600"
          >
            {secondaryActionText}
          </button>
        )}
      </div>
    </article>
  );
}

export default function Network() {
  const isBusiness = isBusinessRole();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [discoverList, setDiscoverList] = useState([]);
  const [myNetworkList, setMyNetworkList] = useState([]);

  async function loadNetwork() {
    try {
      const discover = await getDiscoverList();
      const my = await getMyConnections();
      setDiscoverList(discover);
      setMyNetworkList(my);
    } catch (err) {
      console.error("Failed to load network", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadNetwork();
  }, [refreshKey]);

  const currentList = useMemo(() => {
    const list = activeTab === 'discover' ? discoverList : myNetworkList;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.role.toLowerCase().includes(q) || 
      p.company.toLowerCase().includes(q)
    );
  }, [activeTab, discoverList, myNetworkList, searchQuery]);

  function refresh() {
    setRefreshKey((value) => value + 1);
  }

  async function handlePersonAction(person) {
    if (person === 'view_profile') return; 
    if (activeTab === 'discover') {
      try {
        await connectToUser(person.id);
        refresh();
      } catch (err) {
        console.error("Failed to connect", err);
      }
    } else {
      navigate('/messages', { state: { openContactId: person.id } });
    }
  }

  function handleRemovePerson(person) {
    if (activeTab !== 'my-network') return;
    // Local update for now
    setMyNetworkList(prev => prev.filter(p => p.id !== person.id));
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eaf0ff_0%,#f5f7fb_45%,#f5f7fb_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1240px] space-y-6">
        <DashboardNavbar activePath="/network" />

        <header className="rounded-2xl border border-[rgba(91,97,110,0.18)] bg-white px-6 py-5 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5b616e]">Network</p>
          <h1 className="mt-2 text-[36px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0a0b0d]">{isBusiness ? 'Talent and partner network' : 'People you can trust to build with'}</h1>
          <p className="mt-3 max-w-[760px] text-[16px] leading-[1.6] text-[#5b616e]">{isBusiness ? 'Discover verified talent and manage your business partnership network from one place.' : 'Discover verified professionals and business contacts aligned with your industry and goals.'}</p>
        </header>

        <section className="rounded-2xl border border-[rgba(91,97,110,0.18)] bg-white p-5 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="inline-flex overflow-hidden rounded-full border border-[rgba(91,97,110,0.2)] bg-[#eef0f3] p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('discover')}
                  className={`rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${activeTab === 'discover' ? 'bg-[#0052ff] text-white shadow-sm' : 'text-[#5b616e] hover:text-[#0a0b0d]'}`}
                >
                  Discover Network
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('my-network')}
                  className={`rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${activeTab === 'my-network' ? 'bg-[#0052ff] text-white shadow-sm' : 'text-[#5b616e] hover:text-[#0a0b0d]'}`}
                >
                  My Network
                </button>
              </div>

              <div className="relative w-full max-w-[300px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5b616e]" />
                <input 
                  type="text" 
                  placeholder="Search by name, role or company" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-[rgba(91,97,110,0.25)] pl-10 pr-4 py-2 text-sm outline-none focus:border-[#0052ff]"
                />
              </div>
            </div>

            <p className="text-sm text-[#5b616e]">
              Showing <span className="font-semibold text-[#0a0b0d]">{currentList.length}</span> connections
            </p>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <>
              <NetworkCardSkeleton />
              <NetworkCardSkeleton />
              <NetworkCardSkeleton />
              <NetworkCardSkeleton />
              <NetworkCardSkeleton />
              <NetworkCardSkeleton />
            </>
          ) : (
            currentList.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                actionText={activeTab === 'discover' ? (person.connected ? 'Connected' : (isBusiness ? 'Invite to role' : 'Connect')) : 'Message'}
                onAction={(action) => {
                  if (action === 'view_profile') {
                    setSelectedPerson(person);
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                  }
                  else handlePersonAction(action);
                }}
                secondaryActionText={activeTab === 'my-network' ? 'Remove' : ''}
                onSecondaryAction={activeTab === 'my-network' ? handleRemovePerson : undefined}
              />
            ))
          )}
        </div>

        {/* Inline Profile Preview */}
        {selectedPerson && (
          <div className="animate-in fade-in slide-in-from-bottom-4 mt-8 rounded-2xl border border-[#e2e8f0] bg-[#fafbfd] p-8 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5b616e]">Profile Preview</span>
              <button 
                onClick={() => setSelectedPerson(null)} 
                className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#0a0b0d] transition-colors hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-10">
              <div className="flex h-[100px] w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">
                {(selectedPerson.role?.toLowerCase().includes('business') || selectedPerson.role?.toLowerCase().includes('company')) ? (
                  <div className="flex h-full w-full items-center justify-center bg-[#0a0b0d] text-[32px] font-bold text-white">
                    {selectedPerson.name.charAt(0)}
                  </div>
                ) : (
                  <img src={selectedPerson.photoUrl || `https://i.pravatar.cc/150?u=${selectedPerson.id}`} alt={selectedPerson.name} className="h-full w-full object-cover" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[28px] font-bold tracking-tight text-[#0a0b0d]">{selectedPerson.name}</h2>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#0052ff]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#0052ff]">
                    <ShieldCheck size={14} /> Verified
                  </span>
                  <span className="inline-flex items-center rounded-lg bg-[#eef0f3] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#5b616e]">
                    {(selectedPerson.role?.toLowerCase().includes('business') || selectedPerson.role?.toLowerCase().includes('company')) ? 'Company' : 'People'}
                  </span>
                </div>
                
                <p className="mt-2 text-[16px] font-medium text-[#5b616e]">
                  {selectedPerson.role} {selectedPerson.company && !selectedPerson.role?.toLowerCase().includes('business') ? `at ${selectedPerson.company}` : ''}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[15px] font-medium text-[#5b616e]">
                  <MapPin size={16} /> {selectedPerson.location || 'Bengaluru, India'}
                </div>

                <div className="mt-6">
                  <p className="text-[17px] leading-[1.6] text-[#0a0b0d]">{selectedPerson.note}</p>
                </div>

                <div className="mt-8 flex items-center gap-3">
                  <button
                    onClick={() => {
                      handlePersonAction(selectedPerson);
                      setSelectedPerson(null);
                    }}
                    className="rounded-xl bg-[#0052ff] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#0046d8]"
                  >
                    {activeTab === 'discover' ? (selectedPerson.connected ? 'Connected' : (isBusiness ? 'Invite to role' : 'Connect')) : 'Message'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
