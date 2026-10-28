import { CalendarDays, DollarSign, ShieldCheck, Lock, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import EscrowActionPanel from './EscrowActionPanel';

export default function EventFeedCard({ event, currentUser, onPurchased, onDelete, expanded, onExpand, onCollapse }) {
  // internal expanded state removed; using props

  const statusColors = {
    PUBLISHED: 'bg-emerald-500/10 text-emerald-400',
    CANCELLED: 'bg-red-500/10 text-red-400',
    SETTLED: 'bg-blue-500/10 text-blue-400',
    FRAUD_REFUNDED: 'bg-amber-500/10 text-amber-400',
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-[rgba(91,97,110,0.15)] bg-white shadow-[0_4px_20px_rgba(10,11,13,0.04)] transition-all hover:shadow-[0_8px_30px_rgba(10,11,13,0.08)]">
      {event.posterUrl && (
        <div className="h-40 w-full overflow-hidden rounded-t-2xl">
          <img src={event.posterUrl} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      )}
      <div
        className="flex w-full items-start justify-between gap-3 p-5 text-left"
        onClick={() => onExpand()}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="truncate text-lg font-semibold text-[#0a0b0d]">{event.title}</h3>
            <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${statusColors[event.status] || 'bg-gray-100 text-gray-500'}`}>
              {(event.status || 'PUBLISHED').replace('_', ' ')}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[#5b616e]">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={13} />
              {new Date(event.eventDate || Date.now()).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span className="inline-flex items-center gap-1">
              <DollarSign size={13} />
              {(event.ticketPrice || 0).toFixed(2)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Lock size={11} className="text-[#0052ff]" />
              ${(event.escrowBalance || 0).toFixed(2)} escrow
            </span>
          </div>

          {(event.upfrontPayoutRate || 0) > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
              <ShieldCheck size={13} />
              Verified Organizer — {(event.upfrontPayoutRate * 100).toFixed(0)}% instant payout
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-start gap-2 pt-1 text-[#5b616e]">
          {currentUser.id === event.authorId && (
            <button
              onClick={(e) => { e.stopPropagation(); if(confirm('Delete this event?')) onDelete?.(event.id); }}
              className="rounded-full p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Delete Event"
            >
              <Trash2 size={16} />
            </button>
          )}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {!expanded && (
        <div className="border-t border-[rgba(91,97,110,0.1)] p-4 flex items-center justify-between bg-white">
          <p className="text-xs text-[#5b616e]">
            {(event.status || 'PUBLISHED') === 'PUBLISHED' ? 'Registration is open' : 'Event is closed'}
          </p>
          <button
            onClick={() => onExpand()}
            className="flex items-center gap-2 rounded-full bg-[#0052ff] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[#0046d8]"
          >
            {(event.ticketPrice || 0) === 0 ? 'Register for Free' : `Buy Ticket - $${(event.ticketPrice || 0).toFixed(2)}`}
          </button>
        </div>
      )}

      {expanded && (
        <div className="border-t border-[rgba(91,97,110,0.1)] p-5 pt-4 bg-white">
          <div className="mb-4 flex justify-end">
            <button onClick={() => onCollapse()} className="flex items-center gap-1 text-xs font-semibold text-[#5b616e] hover:text-[#0a0b0d]">
              <ChevronUp size={14} /> Close panel
            </button>
          </div>
          <EscrowActionPanel
            event={event}
            currentUser={currentUser}
            onActionComplete={() => onPurchased?.()}
          />
        </div>
      )}
    </article>
  );
}
