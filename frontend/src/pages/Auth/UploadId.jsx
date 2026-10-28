import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setFlowState, getToken } from '../../utils/flowState';

export default function UploadId() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'individual';

  async function handleContinue() {
    if (!getToken()) {
      navigate('/signin');
      return;
    }

    // Didit handles ID upload and selfie capture inside its own flow.
    setFlowState({
      isAuthenticated: true,
      idVerified: true,
      faceVerified: false,
      role,
    });

    navigate(`/face-verify?role=${role}`);
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-6 py-10 text-[#0a0b0d] lg:px-10">
      <div className="mx-auto grid w-full max-w-[1180px] gap-6 rounded-[32px] border border-[rgba(91,97,110,0.18)] bg-white p-6 shadow-[0_24px_70px_rgba(10,11,13,0.08)] lg:grid-cols-[1.02fr_0.98fr] lg:p-8">
        <section className="rounded-[28px] border border-[rgba(91,97,110,0.18)] bg-[#0a0b0d] p-6 text-white lg:p-8">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/20"
            >
              Back
            </button>
            <span className="rounded-full bg-[#0052ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white">
              Step 1 of 2
            </span>
          </div>

          <h1 className="text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[48px]">
            Identity verification
          </h1>
          <p className="mt-3 max-w-[560px] text-[16px] leading-[1.6] text-white/76">
            You will complete ID upload and live selfie directly inside Didit.
          </p>

          <div className="mt-8 rounded-[26px] border border-white/14 bg-white/6 p-6">
            <p className="text-sm text-white/80">
              We removed local document upload and camera capture to avoid duplicate steps.
              Didit will ask for government ID and live image once, then sync the result here.
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-[rgba(91,97,110,0.18)] bg-[#f8f9fc] p-6 lg:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5b616e]">Verification checklist</p>
          <h2 className="mt-3 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#0a0b0d]">
            Verification checklist
          </h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#5b616e]">
            Didit securely performs full ID and liveness checks.
          </p>

          <div className="mt-8 space-y-3">
            <div className="rounded-2xl border border-[rgba(91,97,110,0.18)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Document type</p>
              <p className="mt-2 text-sm font-semibold text-[#0a0b0d]">Government-issued photo ID (inside Didit)</p>
            </div>
            <div className="rounded-2xl border border-[rgba(91,97,110,0.18)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Liveness</p>
              <p className="mt-2 text-sm font-semibold text-[#0a0b0d]">Captured in Didit</p>
            </div>
            <div className="rounded-2xl border border-[#0052ff]/40 bg-[#0052ff]/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0052ff]">Next step</p>
              <p className="mt-2 text-sm font-semibold text-[#0a0b0d]">Open Didit verification flow</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            className="mt-8 w-full rounded-full bg-[#0052ff] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0046d8]"
          >
            Continue to Didit verification
          </button>
          <button
            type="button"
            onClick={() => navigate('/signin')}
            className="mt-3 w-full rounded-full border border-[rgba(91,97,110,0.25)] px-5 py-3.5 text-sm font-semibold text-[#0a0b0d] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]"
          >
            Save and continue later
          </button>
        </section>
      </div>
    </div>
  );
}
