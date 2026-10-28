import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function VerificationComplete() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-6 py-10 lg:px-10">
      <div className="mx-auto w-full max-w-[760px] rounded-[30px] border border-[rgba(91,97,110,0.18)] bg-white p-8 text-center shadow-[0_20px_60px_rgba(10,11,13,0.08)] lg:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b616e]">Step 3 of 3</p>
        <h1 className="mt-3 text-[40px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0a0b0d]">
          Verification completed
        </h1>
        <p className="mx-auto mt-4 max-w-[560px] text-[16px] leading-[1.6] text-[#5b616e]">
          Your identity checks are complete and your account is now trusted on SyncUp.
        </p>

        <div className="mt-8 rounded-[22px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          Your profile has passed the verification flow successfully.
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="rounded-full bg-[#0052ff] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0046d8]"
          >
            Continue to dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="rounded-full border border-[rgba(91,97,110,0.25)] px-6 py-3 text-sm font-semibold text-[#0a0b0d] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]"
          >
            Explore events
          </button>
        </div>
      </div>
    </div>
  );
}
