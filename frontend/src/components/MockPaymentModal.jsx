import { useState, useEffect } from 'react';
import { CreditCard, Loader2, CheckCircle2, ShieldCheck, X } from 'lucide-react';

export default function MockPaymentModal({ event, onClose, onSuccess, currency = '$', itemLabel = '1x Ticket' }) {
  const [step, setStep] = useState('input'); // input, processing, success

  useEffect(() => {
    if (step === 'processing') {
      const timer = setTimeout(() => {
        setStep('success');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, onSuccess]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-[420px] rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-[rgba(91,97,110,0.12)] px-6 py-4 bg-[#fafbfd]">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-[#0052ff]" />
            <h3 className="text-[16px] font-semibold text-[#0a0b0d]">Secure Checkout</h3>
          </div>
          {step === 'input' && (
            <button onClick={onClose} className="rounded-full p-2 text-[#5b616e] hover:bg-[#eef0f3] transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="mb-6 rounded-xl bg-[#f8fafc] p-4 border border-[rgba(91,97,110,0.12)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5b616e]">Order Summary</p>
            <h4 className="mt-1 text-[15px] font-semibold text-[#0a0b0d] truncate">{event.title}</h4>
            <div className="mt-3 flex items-center justify-between border-t border-[rgba(91,97,110,0.1)] pt-3">
              <span className="text-sm text-[#5b616e]">{itemLabel}</span>
              <span className="text-sm font-bold text-[#0a0b0d]">{currency}{Number(event.ticketPrice || 0).toFixed(2)}</span>
            </div>
          </div>

          {step === 'input' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#5b616e]">Card Number (Mock)</label>
                <div className="relative">
                  <input type="text" readOnly value="•••• •••• •••• 4242" className="w-full rounded-xl border border-[rgba(91,97,110,0.25)] bg-[#f8fafc] px-4 py-3 text-sm font-medium text-[#0a0b0d] outline-none" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                     <div className="h-4 w-6 rounded bg-blue-100 border border-blue-200"></div>
                     <div className="h-4 w-6 rounded bg-red-100 border border-red-200"></div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#5b616e]">Expiry</label>
                  <input type="text" readOnly value="12/28" className="w-full rounded-xl border border-[rgba(91,97,110,0.25)] bg-[#f8fafc] px-4 py-3 text-sm font-medium text-[#0a0b0d] outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#5b616e]">CVC</label>
                  <input type="password" readOnly value="***" className="w-full rounded-xl border border-[rgba(91,97,110,0.25)] bg-[#f8fafc] px-4 py-3 text-sm font-medium text-[#0a0b0d] outline-none" />
                </div>
              </div>
              
              <div className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-600">
                <ShieldCheck size={14} />
                Funds will be held in escrow until the event completes.
              </div>

              <button
                onClick={() => setStep('processing')}
                className="mt-6 w-full rounded-xl bg-[#0a0b0d] py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Pay {currency}{Number(event.ticketPrice || 0).toFixed(2)}
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Loader2 size={40} className="animate-spin text-[#0052ff]" />
              <h4 className="mt-4 text-[16px] font-semibold text-[#0a0b0d]">Processing Payment...</h4>
              <p className="mt-1 text-sm text-[#5b616e]">Contacting mock bank gateway</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in duration-300">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-500">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="mt-4 text-[18px] font-bold text-[#0a0b0d]">Payment Successful</h4>
              <p className="mt-1 text-sm text-[#5b616e]">Securing your ticket...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
