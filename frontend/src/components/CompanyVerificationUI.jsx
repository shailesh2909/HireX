import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, ShieldCheck, Building2, FileText, Upload, CheckCircle2, XCircle, Loader2, User, Globe, Hash, AlertTriangle } from 'lucide-react';
import { getUser } from '../utils/flowState';
import { verifyRegistryAndDomain, checkDocument, verifyDirector } from '../services/companyVerificationApi';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const VERIFICATION_STEPS = [
  { id: 'registry',    label: 'Registry Check',          icon: Building2,  description: 'Verifying company in national registry' },
  { id: 'domain',      label: 'Domain Verification',     icon: Globe,      description: 'Cross-referencing corporate domain ownership' },
  { id: 'document',    label: 'AI Document Forensics',   icon: FileText,   description: 'Cryptographic analysis of incorporation PDF' },
  { id: 'director',    label: 'Director Triangulation',  icon: User,       description: 'Identity triangulation against director records' },
];

const STEP_STATUS = {
  PENDING:  'pending',
  ACTIVE:   'active',
  PASSED:   'passed',
  FAILED:   'failed',
};

/* ─── Step Indicator Component ──────────────────────────────────────────── */

function StepIndicator({ steps, stepStatuses, currentStep }) {
  return (
    <div className="rounded-2xl border border-[rgba(91,97,110,0.14)] bg-[#f8f9fc] p-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#5b616e]">
        Verification Pipeline
      </p>
      <div className="space-y-1">
        {steps.map((step, idx) => {
          const status = stepStatuses[step.id] || STEP_STATUS.PENDING;
          const Icon = step.icon;

          const isActive  = status === STEP_STATUS.ACTIVE;
          const isPassed  = status === STEP_STATUS.PASSED;
          const isFailed  = status === STEP_STATUS.FAILED;
          const isPending = status === STEP_STATUS.PENDING;

          let ringColor = 'border-[rgba(91,97,110,0.2)] bg-white text-[#8a909c]';
          let textColor = 'text-[#8a909c]';
          let descColor = 'text-[#b0b5c0]';
          let barColor  = 'bg-[rgba(91,97,110,0.12)]';

          if (isActive) {
            ringColor = 'border-[#0052ff] bg-[#0052ff]/10 text-[#0052ff] shadow-[0_0_16px_rgba(0,82,255,0.25)]';
            textColor = 'text-[#0052ff] font-semibold';
            descColor = 'text-[#5b616e]';
            barColor  = 'bg-[#0052ff]/20';
          } else if (isPassed) {
            ringColor = 'border-emerald-400 bg-emerald-50 text-emerald-600';
            textColor = 'text-emerald-700 font-semibold';
            descColor = 'text-emerald-600/70';
            barColor  = 'bg-emerald-400';
          } else if (isFailed) {
            ringColor = 'border-red-400 bg-red-50 text-red-500';
            textColor = 'text-red-600 font-semibold';
            descColor = 'text-red-500/70';
            barColor  = 'bg-red-400';
          }

          return (
            <div key={step.id}>
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300">
                {/* Icon ring */}
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${ringColor}`}>
                  {isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPassed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isFailed ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm transition-colors duration-300 ${textColor}`}>
                    {step.label}
                  </p>
                  <p className={`text-[11px] transition-colors duration-300 ${descColor}`}>
                    {step.description}
                  </p>
                </div>

                {/* Status badge */}
                {isPassed && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 animate-fade-in">
                    Passed
                  </span>
                )}
                {isFailed && (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 animate-fade-in">
                    Failed
                  </span>
                )}
                {isActive && (
                  <span className="rounded-full bg-[#0052ff]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0052ff] animate-pulse">
                    Running
                  </span>
                )}
              </div>

              {/* Connector bar */}
              {idx < steps.length - 1 && (
                <div className="ml-[1.35rem] h-4 w-0.5 rounded-full transition-colors duration-500" style={{ backgroundColor: isPassed ? '#34d399' : 'rgba(91,97,110,0.12)' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Drag-and-Drop File Zone ───────────────────────────────────────────── */

function FileDropZone({ file, onFileSelect, disabled }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.type === 'application/pdf' || dropped.name.endsWith('.pdf'))) {
      onFileSelect(dropped);
    }
  }, [disabled, onFileSelect]);

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleInputChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) onFileSelect(selected);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-[#0a0b0d]">
        Incorporation PDF <span className="font-normal text-[#5b616e]">(required)</span>
      </label>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          group relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center
          rounded-2xl border-2 border-dashed p-5 transition-all duration-300
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
          ${isDragOver
            ? 'border-[#0052ff] bg-[#0052ff]/5 shadow-[0_0_20px_rgba(0,82,255,0.12)]'
            : file
              ? 'border-emerald-300 bg-emerald-50/50 hover:border-emerald-400'
              : 'border-[rgba(91,97,110,0.3)] bg-[#f8f9fc] hover:border-[#0052ff]/50 hover:bg-[#0052ff]/3'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
          id="incorporationPdf"
        />

        {file ? (
          <>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <FileText className="h-5 w-5" />
            </div>
            <p className="mt-2 text-sm font-semibold text-emerald-700">{file.name}</p>
            <p className="text-xs text-emerald-600/70">{(file.size / 1024).toFixed(1)} KB — Click or drop to replace</p>
          </>
        ) : (
          <>
            <div className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-300 ${isDragOver ? 'bg-[#0052ff]/15 text-[#0052ff]' : 'bg-[#eef0f3] text-[#8a909c] group-hover:bg-[#0052ff]/10 group-hover:text-[#0052ff]'}`}>
              <Upload className="h-5 w-5" />
            </div>
            <p className="mt-2 text-sm font-semibold text-[#0a0b0d]">
              {isDragOver ? 'Drop your PDF here' : 'Drag & drop your PDF'}
            </p>
            <p className="text-xs text-[#5b616e]">or click to browse — PDF only, max 10 MB</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Verified Corporate Badge ──────────────────────────────────────────── */

function VerifiedBadge({ companyInfo }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-[#eef0f3] p-6 shadow-[0_20px_60px_rgba(16,185,129,0.1)]">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-400/15 blur-2xl" />
      <div className="pointer-events-none absolute -left-8 bottom-0 h-24 w-24 rounded-full bg-[#0052ff]/8 blur-2xl" />

      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_4px_16px_rgba(16,185,129,0.35)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                ✓ Verified Corporate Owner
              </span>
            </div>
            <p className="mt-1 text-xs text-[#5b616e]">Zero-Trust Identity Pipeline — All checks passed</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/70 p-4 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a909c]">Legal Name</p>
            <p className="mt-1 text-base font-semibold text-[#0a0b0d]">{companyInfo?.verified_legal_name || companyInfo?.legalName || 'N/A'}</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-4 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a909c]">Registry Status</p>
            <p className="mt-1 inline-flex rounded-full bg-emerald-100 px-3 py-0.5 text-sm font-semibold text-emerald-700">
              {companyInfo?.registry_status || 'Active'}
            </p>
          </div>
          <div className="rounded-2xl bg-white/70 p-4 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a909c]">Trust Score</p>
            <p className="mt-1 text-lg font-bold text-[#0052ff]">{companyInfo?.trust_score ?? 'N/A'}</p>
          </div>
          <div className="rounded-2xl bg-white/70 p-4 backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a909c]">Domain</p>
            <p className="mt-1 text-sm font-semibold text-[#0a0b0d]">{companyInfo?.official_domain || companyInfo?.domain || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Success Celebration ───────────────────────────────────────────────── */

function SuccessCard({ result }) {
  return (
    <div className="animate-fade-in space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-6 text-center shadow-lg">
        <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgxNiwxODUsMTI5LDAuMDgpIi8+PC9zdmc+')] opacity-50" />
        <div className="relative">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.4)]">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-2xl font-bold text-emerald-800">Verification Complete</h3>
          <p className="mt-1 text-sm text-emerald-600">All 4 zero-trust checks have passed successfully.</p>
        </div>
      </div>

      <VerifiedBadge companyInfo={result} />
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────────── */

export default function CompanyVerificationUI({ onComplete }) {
  /* ── Auth & initial state ─────────────────────────────────────────── */
  const user = getUser();
  const isAlreadyVerified = !!(user?.companyVerified || user?.company_verified);
  const companyInfo = user?.companyInfo || user?.company_info || null;

  /* ── Form state ───────────────────────────────────────────────────── */
  const [companyNumber, setCompanyNumber] = useState('');
  const [claimedDomain, setClaimedDomain] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [directorName, setDirectorName] = useState(user?.name || user?.fullName || '');

  /* ── Pipeline state ───────────────────────────────────────────────── */
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [stepStatuses, setStepStatuses] = useState({});
  const [currentStep, setCurrentStep] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  // ★ FIX: Use a ref for the active step so the catch block always has the
  //   latest value (React state is stale inside async closures).
  const activeStepRef = useRef(null);

  /* ── If user already verified, show badge ─────────────────────────── */
  if (isAlreadyVerified && !isComplete) {
    return <VerifiedBadge companyInfo={companyInfo} />;
  }

  /* ── If verification just completed ───────────────────────────────── */
  if (isComplete && verificationResult) {
    return <SuccessCard result={verificationResult} />;
  }

  /* ── Helper to update a step's status ─────────────────────────────── */
  function updateStep(stepId, status) {
    setStepStatuses((prev) => ({ ...prev, [stepId]: status }));
    setCurrentStep(stepId);
    activeStepRef.current = stepId;  // ★ Keep ref in sync
  }

  /* ── Extract Axios error message + stage ──────────────────────────── */
  function extractError(err) {
    const d = err?.response?.data;
    if (d) {
      const msg = d.message || d.error || 'Verification failed.';
      const stage = d.stage;
      return stage ? `Stage "${stage}" — ${msg}` : msg;
    }
    return err?.message || 'An unexpected error occurred.';
  }

  /* ── Sequential verification chain (stop-on-fail) ─────────────────── */
  async function handleVerify() {
    // Validation
    if (!companyNumber.trim()) { setError('Company Registration Number is required.'); return; }
    if (!claimedDomain.trim()) { setError('Corporate Domain is required.'); return; }
    if (!pdfFile)              { setError('Incorporation PDF document is required.'); return; }
    if (!directorName.trim())  { setError('Director Legal Name is required.'); return; }

    setError('');
    setVerifying(true);
    setVerificationResult(null);
    setIsComplete(false);
    activeStepRef.current = null;
    setStepStatuses({
      registry: STEP_STATUS.PENDING,
      domain:   STEP_STATUS.PENDING,
      document: STEP_STATUS.PENDING,
      director: STEP_STATUS.PENDING,
    });

    // ★ sessionId threads through all stages for server-side gate enforcement
    let sessionId = null;

    try {
      /* ── Step 1 & 2: Registry + Domain ─────────────────────────────── */
      updateStep('registry', STEP_STATUS.ACTIVE);

      const registryResult = await verifyRegistryAndDomain({
        companyNumber: companyNumber.trim(),
        claimedDomain: claimedDomain.trim(),
        userId: user?.id || user?._id || undefined,
      });

      // ★ Capture the sessionId returned by the backend
      sessionId = registryResult.sessionId;
      const verifiedLegalName = registryResult.verified_legal_name;
      updateStep('registry', STEP_STATUS.PASSED);
      updateStep('domain',   STEP_STATUS.PASSED);

      /* ── Step 3: AI Document Forensics ─────────────────────────────── */
      updateStep('document', STEP_STATUS.ACTIVE);

      await checkDocument({
        file: pdfFile,
        sessionId,  // ★ Backend verifies Stage 1 passed before processing
      });

      updateStep('document', STEP_STATUS.PASSED);

      /* ── Step 4: Director Triangulation ────────────────────────────── */
      updateStep('director', STEP_STATUS.ACTIVE);

      const directorResult = await verifyDirector({
        companyNumber: companyNumber.trim(),
        userLegalName: directorName.trim(),
        sessionId,  // ★ Backend verifies Stages 1-3 passed before writing VERIFIED
      });

      updateStep('director', STEP_STATUS.PASSED);

      /* ── All 4 stages passed ─────────────────────────────────────── */
      setVerificationResult({
        verified_legal_name: verifiedLegalName,
        registry_status: directorResult.registryStatus || 'VERIFIED',
        trust_score: registryResult.trust_score,
        official_domain: registryResult.official_domain || claimedDomain.trim(),
        companyRecordId: directorResult.companyRecordId,
        verificationLevel: directorResult.verificationLevel,
        director: directorResult,
        ...registryResult,
      });
      setIsComplete(true);
      if (onComplete) {
        onComplete(directorResult);
      }
    } catch (err) {
      // ★ FIX: Use the ref (always current) instead of the stale state closure
      const failedStep = activeStepRef.current;
      if (failedStep) {
        setStepStatuses((prev) => ({ ...prev, [failedStep]: STEP_STATUS.FAILED }));
      }
      setError(extractError(err));
    } finally {
      setVerifying(false);
    }
  }

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0052ff]/10 text-[#0052ff]">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#0a0b0d]">Zero-Trust Corporate Verification</h2>
          <p className="text-xs text-[#5b616e]">4-step cryptographic identity pipeline</p>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 animate-slide-up">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700">Verification Failed</p>
            <p className="mt-0.5 text-sm text-red-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="ml-auto shrink-0 rounded-full p-1 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step indicator (visible once verification starts) */}
      {verifying && (
        <StepIndicator steps={VERIFICATION_STEPS} stepStatuses={stepStatuses} currentStep={currentStep} />
      )}

      {/* Non-verifying: show the failed steps if there was an error */}
      {!verifying && Object.keys(stepStatuses).length > 0 && error && (
        <StepIndicator steps={VERIFICATION_STEPS} stepStatuses={stepStatuses} currentStep={currentStep} />
      )}

      {/* Form */}
      <div className="rounded-3xl border border-[rgba(91,97,110,0.18)] bg-white p-6 shadow-[0_12px_40px_rgba(10,11,13,0.06)]">
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Company Registration Number */}
          <div className="space-y-2">
            <label htmlFor="corpRegNumber" className="flex items-center gap-1.5 text-sm font-semibold text-[#0a0b0d]">
              <Hash className="h-3.5 w-3.5 text-[#5b616e]" />
              Company Registration Number
            </label>
            <input
              id="corpRegNumber"
              type="text"
              placeholder="e.g. 03977902"
              value={companyNumber}
              onChange={(e) => setCompanyNumber(e.target.value)}
              disabled={verifying}
              className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-[#0052ff] focus:shadow-[0_0_0_3px_rgba(0,82,255,0.08)] disabled:opacity-50"
            />
          </div>

          {/* Corporate Domain */}
          <div className="space-y-2">
            <label htmlFor="corpDomain" className="flex items-center gap-1.5 text-sm font-semibold text-[#0a0b0d]">
              <Globe className="h-3.5 w-3.5 text-[#5b616e]" />
              Corporate Domain
            </label>
            <input
              id="corpDomain"
              type="text"
              placeholder="e.g. google.com"
              value={claimedDomain}
              onChange={(e) => setClaimedDomain(e.target.value)}
              disabled={verifying}
              className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-[#0052ff] focus:shadow-[0_0_0_3px_rgba(0,82,255,0.08)] disabled:opacity-50"
            />
          </div>

          {/* PDF Drop Zone */}
          <div className="sm:col-span-2">
            <FileDropZone file={pdfFile} onFileSelect={setPdfFile} disabled={verifying} />
          </div>

          {/* Director Legal Name */}
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="directorLegalName" className="flex items-center gap-1.5 text-sm font-semibold text-[#0a0b0d]">
              <User className="h-3.5 w-3.5 text-[#5b616e]" />
              Director Legal Name
              {(user?.name || user?.fullName) && (
                <span className="rounded-full bg-[#0052ff]/8 px-2 py-0.5 text-[10px] font-semibold text-[#0052ff]">
                  Auto-filled from profile
                </span>
              )}
            </label>
            <input
              id="directorLegalName"
              type="text"
              placeholder="Full legal name as on incorporation certificate"
              value={directorName}
              readOnly
              className="w-full cursor-not-allowed rounded-2xl border border-[rgba(91,97,110,0.2)] bg-[#f3f5f8] px-4 py-3 text-sm font-medium text-[#5b616e] outline-none"
            />
          </div>

          {/* Info banner */}
          <div className="sm:col-span-2 rounded-2xl border border-[rgba(0,82,255,0.15)] bg-[#0052ff]/4 p-4">
            <p className="text-xs font-semibold text-[#0a0b0d]">How Zero-Trust Verification Works</p>
            <p className="mt-1.5 text-xs leading-relaxed text-[#5b616e]">
              <strong className="text-[#0a0b0d]">Step 1-2:</strong> Registry lookup + domain cross-reference&ensp;→&ensp;
              <strong className="text-[#0a0b0d]">Step 3:</strong> AI-powered document forensics on your incorporation PDF&ensp;→&ensp;
              <strong className="text-[#0a0b0d]">Step 4:</strong> Director identity triangulation against company records.
              <br />
              <span className="text-[#8a909c]">Each step must pass before the next begins. Any failure stops the chain immediately.</span>
            </p>
          </div>

          {/* Submit */}
          <div className="sm:col-span-2">
            <button
              type="button"
              id="verifyCompanyBtn"
              onClick={handleVerify}
              disabled={verifying}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0052ff] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(0,82,255,0.3)] transition-all duration-200 hover:bg-[#0046d8] hover:shadow-[0_6px_20px_rgba(0,82,255,0.4)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Begin Verification
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}