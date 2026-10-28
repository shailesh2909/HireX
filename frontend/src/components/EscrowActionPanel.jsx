import { useState, useCallback } from 'react';
import {
  Ticket, Landmark, Ban, Loader2, AlertTriangle,
  CheckCircle2, ShieldCheck, Shield, Lock, ArrowRightLeft,
} from 'lucide-react';
import { buyTicket } from '../utils/api';
import { escrowApi } from '../services/escrowApi';
import MockPaymentModal from './MockPaymentModal';

export default function EscrowActionPanel({ event, currentUser, onActionComplete }) {
  const [loading, setLoading] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const isOrganizer = currentUser.id === event.authorId;
  const isPublished = event.status === 'PUBLISHED';
  const alreadyBought = event.tickets?.some((t) => t.userId === currentUser.id);

  function clearState() {
    setError('');
    setResult(null);
  }

  const processPurchase = useCallback(async () => {
    clearState();
    setLoading('buy');
    try {
      const data = await buyTicket(event.id);
      setResult({ type: 'success', action: 'buy', data });
      onActionComplete?.('buy', data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
      setShowPaymentModal(false);
    }
  }, [event.id, onActionComplete]);

  function handleBuy() {
    const price = Number(event.ticketPrice || 0);
    if (price > 0) {
      setShowPaymentModal(true);
    } else {
      processPurchase();
    }
  }

  async function handleSettle() {
    clearState();
    setLoading('settle');
    try {
      const data = await escrowApi.settleEscrow(event.id, currentUser.id);
      setResult({
        type: data.fraud ? 'fraud' : 'success',
        action: 'settle',
        data,
      });
      onActionComplete?.('settle', data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  }

  async function handleCancel() {
    clearState();
    setLoading('cancel');
    try {
      const data = await escrowApi.cancelAndRefund(event.id, currentUser.id);
      setResult({ type: 'success', action: 'cancel', data });
      setConfirmCancel(false);
      onActionComplete?.('cancel', data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  }

  const totalTickets = event.tickets?.length || 0;
  const usedTickets = event.tickets?.filter((t) => t.status === 'USED').length || 0;
  const attendancePct = totalTickets > 0 ? ((usedTickets / totalTickets) * 100).toFixed(1) : '0';

  return (
    <div className="rounded-2xl border border-[rgba(91,97,110,0.12)] bg-gradient-to-b from-white to-[#fafbfd] p-5 shadow-[0_2px_16px_rgba(10,11,13,0.04)]">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#5b616e]">
        <ArrowRightLeft size={12} className="text-[#0052ff]" />
        Escrow Actions
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[#0a0b0d] px-3 py-2.5 text-center">
          <Lock size={14} className="mx-auto text-[#0052ff]" />
          <p className="mt-1 text-xs font-semibold text-white">${event.escrowBalance?.toFixed(2) || '0.00'}</p>
          <p className="text-[9px] uppercase tracking-wider text-white/40">Escrow</p>
        </div>
        <div className="rounded-xl bg-[#0a0b0d] px-3 py-2.5 text-center">
          <Ticket size={14} className="mx-auto text-violet-400" />
          <p className="mt-1 text-xs font-semibold text-white">{totalTickets}</p>
          <p className="text-[9px] uppercase tracking-wider text-white/40">Sold</p>
        </div>
        <div className="rounded-xl bg-[#0a0b0d] px-3 py-2.5 text-center">
          <CheckCircle2 size={14} className={`mx-auto ${parseFloat(attendancePct) >= 20 ? 'text-emerald-400' : 'text-red-400'}`} />
          <p className="mt-1 text-xs font-semibold text-white">{attendancePct}%</p>
          <p className="text-[9px] uppercase tracking-wider text-white/40">Attended</p>
        </div>
      </div>

      {event.upfrontPayoutRate > 0 && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-500/8 px-3 py-2 text-[11px] font-medium text-emerald-600">
          <ShieldCheck size={13} />
          {(event.upfrontPayoutRate * 100).toFixed(0)}% upfront — ${(totalTickets * event.ticketPrice * event.upfrontPayoutRate).toFixed(2)} released
        </div>
      )}

      <div className="mt-4 space-y-2.5">
        {!isOrganizer && isPublished && !alreadyBought && (
          <button
            onClick={handleBuy}
            disabled={loading === 'buy'}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0052ff] py-3 text-sm font-semibold text-white transition-all hover:bg-[#0046d8] active:scale-[0.98] disabled:opacity-50"
          >
            {loading === 'buy' ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Processing Transaction...
              </>
            ) : (
              <>
                <Ticket size={15} />
                Buy Ticket — ${event.ticketPrice?.toFixed(2)}
              </>
            )}
          </button>
        )}

        {!isOrganizer && alreadyBought && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600">
            <Shield size={15} />
            Ticket Secured — Escrow Protected
          </div>
        )}

        {isOrganizer && isPublished && (
          <>
            <button
              onClick={handleSettle}
              disabled={!!loading || totalTickets === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40"
            >
              {loading === 'settle' ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Settling Escrow...
                </>
              ) : (
                <>
                  <Landmark size={15} />
                  Settle & Release Funds
                </>
              )}
            </button>

            <p className="px-1 text-[11px] leading-relaxed text-[#5b616e]/70">
              Requires &ge;20% check-in rate. Below 20% triggers fraud clawback &mdash; upfront payouts reclaimed, all buyers refunded.
            </p>

            {!confirmCancel ? (
              <button
                onClick={() => { setConfirmCancel(true); clearState(); }}
                disabled={!!loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-200 py-2.5 text-xs font-semibold text-red-500 transition-all hover:border-red-300 hover:bg-red-50 disabled:opacity-40"
              >
                <Ban size={14} />
                Cancel Event & Refund All
              </button>
            ) : (
              <div className="rounded-xl border-2 border-red-300 bg-red-50 p-3">
                <p className="flex items-center gap-2 text-xs font-semibold text-red-600">
                  <AlertTriangle size={14} />
                  This will clawback upfront payouts and refund every buyer. Irreversible.
                </p>
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={loading === 'cancel'}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 py-2.5 text-xs font-bold text-white transition-all hover:bg-red-600 disabled:opacity-50"
                  >
                    {loading === 'cancel' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <AlertTriangle size={14} />
                    )}
                    Confirm Cancellation
                  </button>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="rounded-lg border border-red-200 px-4 py-2.5 text-xs font-medium text-red-400 transition-colors hover:bg-white"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!isPublished && (
          <div className="rounded-xl bg-[#f5f7fb] px-4 py-3 text-center text-xs font-medium text-[#5b616e]">
            Event {event.status?.toLowerCase().replace('_', ' ')} — no actions available
          </div>
        )}
      </div>

      {result && (
        <div className={`mt-3 flex items-start gap-2 rounded-xl px-4 py-3 text-xs font-medium ${
          result.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
          result.type === 'fraud' ? 'bg-amber-50 text-amber-600' :
          'bg-red-50 text-red-500'
        }`}>
          {result.type === 'fraud' ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
          <span>
            {result.action === 'buy' && 'Ticket purchased — funds held in escrow until event settlement.'}
            {result.action === 'settle' && !result.data?.fraud && 'Escrow released to your wallet. Event settled successfully.'}
            {result.action === 'settle' && result.data?.fraud && `Fraud detected — ${attendancePct}% attendance. Upfront payouts clawed back, all buyers refunded.`}
            {result.action === 'cancel' && 'Event cancelled. Upfront payouts clawed back and all buyers refunded.'}
          </span>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-500">
          <AlertTriangle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {showPaymentModal && (
        <MockPaymentModal
          event={event}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={processPurchase}
        />
      )}
    </div>
  );
}
