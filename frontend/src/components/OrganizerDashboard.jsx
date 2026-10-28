import { useState } from 'react';
import {
  ScanLine, Landmark, Lock, DollarSign,
  CheckCircle2, Loader2, Users, Ticket, ShieldCheck,
  ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react';
import { scanTicket } from '../services/api';
import EscrowActionPanel from './EscrowActionPanel';
import DiditVerificationModal from './DiditVerificationModal';

function StatCard({ icon: Icon, label, value, accent = '#0052ff' }) {
  return (
    <div className="rounded-2xl border border-[rgba(91,97,110,0.12)] bg-white p-4 shadow-[0_2px_12px_rgba(10,11,13,0.03)]">
      <div className="flex items-center gap-3">
        <div className="rounded-xl p-2.5" style={{ backgroundColor: `${accent}15` }}>
          <Icon size={18} style={{ color: accent }} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5b616e]">{label}</p>
          <p className="mt-0.5 text-lg font-semibold text-[#0a0b0d]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function EventPanel({ event, currentUser, onUpdate }) {
  const [scanHash, setScanHash] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const totalTickets = event.tickets?.length || 0;
  const usedTickets = event.tickets?.filter((t) => t.status === 'USED').length || 0;
  const attendanceRate = totalTickets > 0 ? ((usedTickets / totalTickets) * 100).toFixed(1) : '0.0';
  const isActive = event.status === 'PUBLISHED';

  function showScanMessage(type, text) {
    setScanMessage({ type, text });
    setTimeout(() => setScanMessage(null), 4000);
  }

  async function handleScan() {
    if (!scanHash.trim()) return;
    setScanLoading(true);
    try {
      await scanTicket(currentUser, event.id, scanHash.trim());
      showScanMessage('success', 'Ticket scanned — attendee checked in');
      setScanHash('');
      onUpdate?.();
    } catch (err) {
      showScanMessage('error', err.message);
    } finally {
      setScanLoading(false);
    }
  }

  const statusColors = {
    PUBLISHED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    CANCELLED: 'bg-red-500/10 text-red-500 border-red-500/20',
    SETTLED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    FRAUD_REFUNDED: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  };

  return (
    <div className="rounded-2xl border border-[rgba(91,97,110,0.12)] bg-white shadow-[0_2px_16px_rgba(10,11,13,0.04)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[#f5f7fb]/60"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="truncate text-base font-semibold text-[#0a0b0d]">{event.title}</h3>
            <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${statusColors[event.status] || ''}`}>
              {event.status.replace('_', ' ')}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#5b616e]">
            {new Date(event.eventDate).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
        {expanded ? <ChevronUp size={18} className="text-[#5b616e]" /> : <ChevronDown size={18} className="text-[#5b616e]" />}
      </button>

      {expanded && (
        <div className="border-t border-[rgba(91,97,110,0.1)] px-5 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Lock} label="Escrow" value={`$${event.escrowBalance.toFixed(2)}`} />
            <StatCard icon={Ticket} label="Tickets Sold" value={totalTickets} accent="#7c3aed" />
            <StatCard icon={Users} label="Checked In" value={usedTickets} accent="#059669" />
            <StatCard icon={DollarSign} label="Attendance" value={`${attendanceRate}%`} accent={parseFloat(attendanceRate) >= 20 ? '#059669' : '#ef4444'} />
          </div>

          {event.upfrontPayoutRate > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-[11px] font-medium text-emerald-600">
              <ShieldCheck size={14} />
              {(event.upfrontPayoutRate * 100).toFixed(0)}% upfront payout active — ${(totalTickets * event.ticketPrice * event.upfrontPayoutRate).toFixed(2)} already released
            </div>
          )}

          {isActive && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5b616e]">
                Proof of Attendance Scanner
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={scanHash}
                  onChange={(e) => setScanHash(e.target.value)}
                  placeholder="Paste attendee check-in hash..."
                  className="flex-1 rounded-xl border border-[rgba(91,97,110,0.2)] bg-[#f5f7fb] px-4 py-2.5 font-mono text-xs text-[#0a0b0d] outline-none transition-colors focus:border-[#0052ff] focus:bg-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                />
                <button
                  onClick={handleScan}
                  disabled={scanLoading || !scanHash.trim()}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#0a0b0d] px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-[#1a1b1d] disabled:opacity-40"
                >
                  {scanLoading ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />}
                  Scan
                </button>
              </div>

              {scanMessage && (
                <div className={`mt-2 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium ${scanMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {scanMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {scanMessage.text}
                </div>
              )}
            </div>
          )}

          <EscrowActionPanel
            event={event}
            currentUser={currentUser}
            onActionComplete={() => onUpdate?.()}
          />
        </div>
      )}
    </div>
  );
}

export default function OrganizerDashboard({ events = [], currentUser, onUpdate }) {
  const [isDiditModalOpen, setIsDiditModalOpen] = useState(false);
  const [verifiedLocally, setVerifiedLocally] = useState(false);

  const isIdentityVerified = Boolean(currentUser?.isVerified || currentUser?.identityVerified || verifiedLocally);
  const myEvents = events.filter((e) => e.organizerId === currentUser.id);
  const totalEscrow = myEvents.reduce((sum, e) => sum + (e.escrowBalance || 0), 0);
  const totalSold = myEvents.reduce((sum, e) => sum + (e.tickets?.length || 0), 0);

  if (myEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(91,97,110,0.2)] bg-white/50 py-16 text-center">
        <Landmark size={40} className="text-[#5b616e]/30" />
        <p className="mt-4 text-sm font-medium text-[#5b616e]">No events created yet</p>
        <p className="mt-1 text-xs text-[#5b616e]/60">Create your first event to start managing the trust pipeline</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5b616e]">Organizer</p>
        <h2 className="mt-1 text-xl font-semibold text-[#0a0b0d]">Command Center</h2>
      </div>

      {!isIdentityVerified ? (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-700">Identity Verification</p>
              <p className="mt-1 text-sm text-cyan-900">Verify your identity to unlock trusted organizer payout benefits.</p>
            </div>
            <button
              onClick={() => setIsDiditModalOpen(true)}
              className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
            >
              Verify Identity to Unlock Payouts
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Landmark} label="Total Escrow" value={`$${totalEscrow.toFixed(2)}`} />
        <StatCard icon={Ticket} label="Total Tickets" value={totalSold} accent="#7c3aed" />
        <StatCard icon={Users} label="Events" value={myEvents.length} accent="#059669" />
      </div>

      <div className="space-y-3">
        {myEvents.map((event) => (
          <EventPanel key={event.id} event={event} currentUser={currentUser} onUpdate={onUpdate} />
        ))}
      </div>

      <DiditVerificationModal
        isOpen={isDiditModalOpen}
        currentUser={currentUser}
        onClose={() => setIsDiditModalOpen(false)}
        onVerified={() => {
          setVerifiedLocally(true);
          onUpdate?.();
        }}
      />
    </div>
  );
}
