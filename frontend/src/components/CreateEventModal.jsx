import { useState } from 'react';
import { X, CalendarDays, DollarSign, Type, ShieldCheck, ShieldAlert } from 'lucide-react';
import { createEvent } from '../utils/api';
import { uploadFile } from '../utils/imagekit';

export default function CreateEventModal({ currentUser, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let posterUrl;
      if (posterFile) {
        const result = await uploadFile(posterFile, `poster-${Date.now()}`, ['event-poster']);
        posterUrl = result.url;
      }
      const event = await createEvent({
        title,
        ticketPrice: parseFloat(ticketPrice),
        eventDate: new Date(eventDate).toISOString(),
        posterUrl,
      });
      onCreated?.(event);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0f1117] p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0052ff]">Create Event</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">Publish a new event</h2>
        </div>

        {currentUser.isVerified ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <ShieldCheck size={20} className="shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">Verified Organizer</p>
              <p className="text-xs text-emerald-300/70">Eligible for 30% Upfront Payout</p>
            </div>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
            <ShieldAlert size={20} className="shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Standard Organizer</p>
              <p className="text-xs text-amber-300/70">100% Escrow Hold until settlement</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
              <Type size={13} /> Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Founder x Engineer Matchday"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-[#0052ff]/60 focus:bg-white/[0.08]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                <DollarSign size={13} /> Ticket Price
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={ticketPrice}
                onChange={(e) => setTicketPrice(e.target.value)}
                required
                placeholder="50.00"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-[#0052ff]/60 focus:bg-white/[0.08]"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                <CalendarDays size={13} /> Event Date
              </label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-[#0052ff]/60 focus:bg-white/[0.08] [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
              Event Poster (optional)
            </label>
            {posterPreview ? (
              <div className="relative">
                <img src={posterPreview} alt="Poster" className="max-h-32 w-full rounded-xl object-cover" />
                <button type="button" onClick={() => { setPosterFile(null); setPosterPreview(''); }} className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white"><X size={12} /></button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 py-4 text-xs text-white/40 transition-colors hover:border-white/40 hover:bg-white/10">
                Click to upload poster
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setPosterFile(f); setPosterPreview(URL.createObjectURL(f)); }
                }} />
              </label>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-[#0052ff] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#0046d8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating...
              </span>
            ) : (
              'Publish Event'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
