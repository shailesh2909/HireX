import { useState, useEffect, useCallback } from 'react';
import { Plus, Layers, Ticket, LayoutDashboard, Wallet, RefreshCw } from 'lucide-react';
import { getUser } from '../utils/flowState';
import CreateEventModal from '../components/CreateEventModal';
import EventFeedCard from '../components/EventFeedCard';
import AttendeeDashboard from '../components/AttendeeDashboard';
import OrganizerDashboard from '../components/OrganizerDashboard';
import DashboardNavbar from '../components/DashboardNavbar';
import { PostSkeleton } from '../components/Skeleton';

import { getEvents, createEvent, deleteEvent } from '../utils/api';
const API_BASE = '/api/community/events';

export default function Events() {
  const storedUser = getUser();
  const currentUser = {
    id: storedUser?.id || storedUser?.email || 'demo-user',
    isVerified: storedUser?.identityVerified || false,
    balance: 1000,
  };

  const [tab, setTab] = useState('feed');
  const [showCreate, setShowCreate] = useState(false);
  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(null);
  const [walletRefreshing, setWalletRefreshing] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWallet = useCallback(async () => {
    try {
      setWalletRefreshing(true);
      const res = await fetch(`${API_BASE}/wallet`, {
        headers: {
          'x-user-id': currentUser.id,
          'x-is-verified': String(currentUser.isVerified),
        },
      });
      if (res.ok) {
        const data = await res.json();
        setWalletBalance(data.balance);
      }
    } catch {
    } finally {
      setWalletRefreshing(false);
    }
  }, [currentUser.id, currentUser.isVerified]);

  useEffect(() => {
    fetchEvents();
    fetchWallet();
  }, [fetchEvents, fetchWallet]);

  useEffect(() => {
    const myTickets = [];
    for (const event of events) {
      if (event.tickets) {
        for (const ticket of event.tickets) {
          if (ticket.userId === currentUser.id) {
            myTickets.push({ ...ticket, event });
          }
        }
      }
    }
    setTickets(myTickets);
  }, [events, currentUser.id]);

  async function handleDelete(eventId) {
    try {
      await deleteEvent(eventId);
      fetchEvents();
    } catch (err) {
      console.error("Failed to delete event", err);
    }
  }

  function handleActionComplete() {
    fetchEvents();
    fetchWallet();
  }

  const tabs = [
    { id: 'feed', label: 'Browse Events', icon: Layers },
    { id: 'tickets', label: 'My Tickets', icon: Ticket },
    { id: 'organizer', label: 'Organizer', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eaf0ff_0%,#f5f7fb_45%,#f5f7fb_100%)] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-[1240px] space-y-6">
        <DashboardNavbar activePath="/events" />

        <header className="rounded-sm border border-[rgba(91,97,110,0.18)] bg-[#0a0b0d] px-6 py-5 text-white shadow-[0_8px_24px_rgba(10,11,13,0.16)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a6b3d1]">Trust Engine</p>
              <h1 className="mt-2 text-[32px] font-semibold leading-[1.06] tracking-[-0.03em] sm:text-[36px]">
                Events & Escrow
              </h1>
              <p className="mt-3 max-w-[760px] text-[15px] leading-[1.6] text-white/60">
                Smart escrow protection, cryptographic proof-of-attendance, and automated fraud detection.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 rounded-sm border border-white/10 bg-white/5 px-5 py-3.5 backdrop-blur">
              <div className="rounded-sm bg-[#0052ff]/20 p-2.5">
                <Wallet size={18} className="text-[#0052ff]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Wallet Balance</p>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-semibold text-white">
                    {walletBalance !== null ? `₹${walletBalance.toFixed(2)}` : '—'}
                  </p>
                  <button
                    onClick={fetchWallet}
                    disabled={walletRefreshing}
                    className="rounded-sm p-1 text-white/30 transition-colors hover:text-white/60"
                  >
                    <RefreshCw size={12} className={walletRefreshing ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-sm bg-white p-1 shadow-[0_2px_8px_rgba(10,11,13,0.04)]">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-sm px-4 py-2.5 text-xs font-semibold transition-all ${
                  tab === t.id
                    ? 'bg-[#0a0b0d] text-white shadow-sm'
                    : 'text-[#5b616e] hover:bg-[#f5f7fb] hover:text-[#0a0b0d]'
                }`}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-sm bg-[#0052ff] px-5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#0046d8] active:scale-[0.98]"
          >
            <Plus size={15} />
            Create Event
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 items-start">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : (
          <>
            {tab === 'feed' && (
              <div className="grid gap-4 sm:grid-cols-2 items-start">
                {events.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center rounded-sm border border-dashed border-[rgba(91,97,110,0.2)] bg-white/50 py-16 text-center">
                    <Layers size={40} className="text-[#5b616e]/30" />
                    <p className="mt-4 text-sm font-medium text-[#5b616e]">No events found</p>
                    <p className="mt-1 text-xs text-[#5b616e]/60">Create the first event to get started</p>
                  </div>
                ) : (
                  events.map((event) => (
                    <EventFeedCard
                      key={event.id}
                      event={event}
                      currentUser={currentUser}
                      onPurchased={handleActionComplete}
                      onDelete={handleDelete}
                      expanded={expandedEventId === event.id}
                      onExpand={() => setExpandedEventId(event.id)}
                      onCollapse={() => setExpandedEventId(null)}
                    />
                  ))
                )}
              </div>
            )}

            {tab === 'tickets' && (
              <AttendeeDashboard tickets={tickets} />
            )}

            {tab === 'organizer' && (
              <OrganizerDashboard
                events={events}
                currentUser={currentUser}
                onUpdate={handleActionComplete}
              />
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateEventModal
          currentUser={currentUser}
          onClose={() => setShowCreate(false)}
          onCreated={handleActionComplete}
        />
      )}
    </div>
  );
}
