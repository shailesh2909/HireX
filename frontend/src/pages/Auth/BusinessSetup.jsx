import React from 'react';
import { useNavigate } from 'react-router-dom';
import CompanyVerificationUI from '../../components/CompanyVerificationUI';

/**
 * BusinessSetup page — onboarding step for company verification.
 * 
 * This is now a thin wrapper around the CompanyVerificationUI component
 * which uses the real 4-stage Zero-Trust pipeline via company-svc (port 3002):
 *   Stage 1: UK Companies House Registry Check
 *   Stage 2: Domain Enrichment (AbstractAPI)
 *   Stage 3: AI Document Forensics (EasyOCR via Python forensics-svc)
 *   Stage 4: Director Identity Triangulation
 */
export default function BusinessSetup() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-6 py-10 lg:px-10">
      <div className="mx-auto w-full max-w-[980px] rounded-[30px] border border-[rgba(91,97,110,0.18)] bg-white p-8 shadow-[0_20px_60px_rgba(10,11,13,0.08)] lg:p-10">
        {/* The CompanyVerificationUI handles the full flow:
            - Shows form if not yet verified
            - Shows "Verified Corporate Owner" badge if already verified
            - Chains all 4 stages with stop-on-fail logic */}
        <CompanyVerificationUI 
          onComplete={(result) => {
            // Wait 3 seconds so the user can see the beautiful "Verification Complete" animation/badge
            setTimeout(() => navigate('/home'), 3000);
          }} 
        />

      </div>
    </div>
  );
}
