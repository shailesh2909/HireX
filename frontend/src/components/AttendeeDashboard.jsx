import { Ticket, Hash, Clock, CheckCircle2, XCircle, Copy, Check, QrCode } from 'lucide-react';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

function TicketCard({ ticket }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(true);

  const statusConfig = {
    VALID: { icon: Ticket, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Valid' },
    USED: { icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Checked In' },
    REFUNDED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Refunded' },
  };

  const config = statusConfig[ticket.status] || statusConfig.VALID;
  const StatusIcon = config.icon;

  function handleCopy() {
    navigator.clipboard.writeText(ticket.checkInHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(91,97,110,0.12)] bg-white shadow-[0_2px_12px_rgba(10,11,13,0.03)]">
      <div className="flex items-center justify-between border-b border-dashed border-[rgba(91,97,110,0.15)] px-5 py-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-[#0a0b0d]">
            {ticket.event?.title || 'Event'}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#5b616e]">
            <Clock size={12} />
            {ticket.event?.eventDate
              ? new Date(ticket.event.eventDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Date TBD'}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${config.bg} ${config.color}`}>
          <StatusIcon size={12} />
          {config.label}
        </span>
      </div>

      {ticket.status === 'VALID' && showQr && (
        <div className="flex flex-col items-center border-b border-dashed border-[rgba(91,97,110,0.15)] bg-gradient-to-b from-[#fafbfd] to-white px-5 py-6">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#5b616e]">
            Show this QR to the organizer
          </p>
          <div className="rounded-2xl border-2 border-[#0a0b0d]/10 bg-white p-4 shadow-[0_4px_20px_rgba(10,11,13,0.06)]">
            <QRCodeSVG
              value={ticket.checkInHash}
              size={180}
              level="H"
              bgColor="#ffffff"
              fgColor="#0a0b0d"
              includeMargin={false}
            />
          </div>
          <p className="mt-3 text-[11px] font-medium text-[#0052ff]">
            Proof of Attendance Pass
          </p>
        </div>
      )}

      {ticket.status === 'USED' && (
        <div className="flex flex-col items-center border-b border-dashed border-[rgba(91,97,110,0.15)] bg-blue-50/50 px-5 py-5">
          <CheckCircle2 size={32} className="text-blue-500" />
          <p className="mt-2 text-sm font-semibold text-blue-600">Attendance Verified</p>
          <p className="mt-0.5 text-[11px] text-blue-400">
            Scanned {ticket.scannedAt ? new Date(ticket.scannedAt).toLocaleString() : ''}
          </p>
        </div>
      )}

      {ticket.status === 'REFUNDED' && (
        <div className="flex flex-col items-center border-b border-dashed border-[rgba(91,97,110,0.15)] bg-red-50/50 px-5 py-5">
          <XCircle size={32} className="text-red-400" />
          <p className="mt-2 text-sm font-semibold text-red-500">Ticket Refunded</p>
          <p className="mt-0.5 text-[11px] text-red-400">Funds returned to your wallet</p>
        </div>
      )}

      <div className="px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5b616e]">
            Check-In Hash
          </p>
          <div className="flex items-center gap-1.5">
            {ticket.status === 'VALID' && (
              <button
                onClick={() => setShowQr(!showQr)}
                className="rounded-lg p-1.5 text-[#5b616e] transition-colors hover:bg-[#f5f7fb] hover:text-[#0052ff]"
              >
                <QrCode size={14} />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="rounded-lg p-1.5 text-[#5b616e] transition-colors hover:bg-[#f5f7fb] hover:text-[#0052ff]"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
        <div className="mt-2 overflow-hidden rounded-xl bg-[#0a0b0d] px-4 py-3">
          <div className="flex items-center gap-2">
            <Hash size={14} className="shrink-0 text-[#0052ff]" />
            <code className="truncate font-mono text-xs tracking-wide text-emerald-400">
              {ticket.checkInHash}
            </code>
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-[rgba(91,97,110,0.15)] px-5 py-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#5b616e]">Paid</span>
          <span className="font-semibold text-[#0a0b0d]">${ticket.pricePaid?.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export default function AttendeeDashboard({ tickets = [] }) {
  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(91,97,110,0.2)] bg-white/50 py-16 text-center">
        <Ticket size={40} className="text-[#5b616e]/30" />
        <p className="mt-4 text-sm font-medium text-[#5b616e]">No tickets yet</p>
        <p className="mt-1 text-xs text-[#5b616e]/60">Your purchased event tickets will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5b616e]">Your Tickets</p>
          <h2 className="mt-1 text-xl font-semibold text-[#0a0b0d]">Attendee Dashboard</h2>
        </div>
        <span className="rounded-full bg-[#0052ff]/10 px-3 py-1.5 text-xs font-bold text-[#0052ff]">
          {tickets.length} {tickets.length === 1 ? 'Ticket' : 'Tickets'}
        </span>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <p className="text-xs font-semibold text-emerald-700">How to check in</p>
        <ol className="mt-2 space-y-1 text-[12px] leading-relaxed text-emerald-600">
          <li>1. Show the <strong>QR code</strong> on your ticket to the event organizer</li>
          <li>2. The organizer scans or enters your hash in their dashboard</li>
          <li>3. Your ticket status updates to <strong>"Checked In"</strong> instantly</li>
        </ol>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}
