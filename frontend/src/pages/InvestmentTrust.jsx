import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isBusinessRole } from '../utils/flowState';
import {
  calculateInvestmentTrustScore,
  getInvestmentTrustState,
  setInvestmentTrustState,
} from '../utils/investmentTrustState';
import DashboardNavbar from '../components/DashboardNavbar';

const founderChecklistLabels = {
  legalIdentityVerified: 'Legal entity identity verified',
  ownerKycVerified: 'Founder / owner KYC completed',
  capTableUploaded: 'Cap table and ownership proof uploaded',
  liveVerificationCallDone: 'Live owner verification call completed',
};

const communicationLabels = {
  onlyVerifiedInvestorsCanMessage: 'Only verified investors can initiate investment chat',
  ndaRequiredBeforeDataRoom: 'NDA required before data room access',
  ownerMustApproveInvestmentCalls: 'Owner approval needed before investment calls',
};

const escalationLabels = {
  suspiciousIntermediaryFlagEnabled: 'Flag and pause suspicious intermediary activity',
  highValueDealRequiresSecondOwnerApproval: 'Second owner approval for high-value deals',
  complianceReviewForRepresentativeChanges: 'Compliance review when representative list changes',
};

const antiBrokerLabels = {
  noUnlistedIntermediaryAllowed: 'Disallow unlisted intermediaries',
  ownerDeclarationAccepted: 'Owner declaration against unauthorized brokerage accepted',
};

function statusTone(isActive) {
  return isActive
    ? 'border-[#1d8a4c] bg-[#1d8a4c]/10 text-[#1d8a4c]'
    : 'border-[rgba(91,97,110,0.25)] bg-[#eef0f3] text-[#5b616e]';
}

export default function InvestmentTrust() {
  const navigate = useNavigate();
  const isBusiness = isBusinessRole();
  const [state, setState] = useState(() => getInvestmentTrustState());
  const [newRep, setNewRep] = useState({
    fullName: '',
    designation: '',
    email: '',
    authorityScope: '',
    isIdentityVerified: false,
  });
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const trustScore = useMemo(() => calculateInvestmentTrustScore(state), [state]);

  function persist(next) {
    setState(next);
    setInvestmentTrustState(next);
  }

  function toggleGroup(groupName, key) {
    persist({
      ...state,
      [groupName]: {
        ...state[groupName],
        [key]: !state[groupName][key],
      },
    });
  }

  function addRepresentative(event) {
    event.preventDefault();
    if (!newRep.fullName.trim() || !newRep.designation.trim()) {
      return;
    }

    const nextRepresentative = {
      id: `rep-${Date.now()}`,
      fullName: newRep.fullName.trim(),
      designation: newRep.designation.trim(),
      email: newRep.email.trim(),
      authorityScope: newRep.authorityScope.trim() || 'Investment communication rights',
      isIdentityVerified: Boolean(newRep.isIdentityVerified),
      isPrimaryOwner: false,
    };

    persist({
      ...state,
      authorizedRepresentatives: [...state.authorizedRepresentatives, nextRepresentative],
    });

    setNewRep({
      fullName: '',
      designation: '',
      email: '',
      authorityScope: '',
      isIdentityVerified: false,
    });
  }

  function removeRepresentative(id) {
    persist({
      ...state,
      authorizedRepresentatives: state.authorizedRepresentatives.filter((rep) => rep.id !== id),
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eaf0ff_0%,#f5f7fb_45%,#f5f7fb_100%)] px-6 py-8 text-[#0a0b0d] lg:px-10">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
        <DashboardNavbar activePath="/investment-trust" />

        <header className="rounded-[24px] border border-[rgba(91,97,110,0.18)] bg-white p-6 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b616e]">Investment Integrity</p>
              <h1 className="mt-2 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em]">Direct owner-to-investor trust controls</h1>
              <p className="mt-2 max-w-[760px] text-sm leading-[1.6] text-[#5b616e]">
                Enforce founder verification, map authorized representatives, and keep investment conversations directly between verified parties.
              </p>
            </div>

            <div className="rounded-[18px] border border-[#0052ff]/25 bg-[#0052ff]/8 px-5 py-4 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Trust score</p>
              <p className="mt-1 text-[30px] font-semibold text-[#0052ff]">{trustScore}%</p>
              <p className="text-xs text-[#5b616e]">Based on verification and control readiness</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate('/home')} className="rounded-full border border-[rgba(91,97,110,0.25)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]">Back to home</button>
            <button type="button" onClick={() => navigate('/network')} className="rounded-full border border-[rgba(91,97,110,0.25)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]">Verified network</button>
            {!isBusiness && (
              <span className="rounded-full border border-[#c87e11]/35 bg-[#c87e11]/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8f5a0d]">
                Business accounts use this workflow most
              </span>
            )}
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="rounded-[24px] border border-[rgba(91,97,110,0.18)] bg-white p-6">
              <h2 className="text-lg font-semibold">Founder / owner verification</h2>
              <p className="mt-1 text-sm text-[#5b616e]">Investment introductions remain active only after primary owner checks are complete.</p>
              <div className="mt-4 grid gap-3">
                {Object.entries(founderChecklistLabels).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-4 rounded-[14px] border border-[rgba(91,97,110,0.2)] bg-[#f8f9fc] px-4 py-3 text-sm">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={state.founderVerification[key]}
                      onChange={() => toggleGroup('founderVerification', key)}
                      className="h-4 w-4 accent-[#0052ff]"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[rgba(91,97,110,0.18)] bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Authorized representative mapping</h2>
                <span className="rounded-full border border-[rgba(91,97,110,0.25)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#5b616e]">
                  {state.authorizedRepresentatives.length} listed
                </span>
              </div>
              <p className="mt-1 text-sm text-[#5b616e]">Only mapped and verified representatives can appear in investor threads.</p>

              <div className="mt-4 space-y-3">
                {state.authorizedRepresentatives.map((rep) => (
                  <article key={rep.id} className="rounded-[16px] border border-[rgba(91,97,110,0.2)] bg-[#f8f9fc] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{rep.fullName || 'Unnamed representative'}</p>
                        <p className="text-xs text-[#5b616e]">{rep.designation || 'Role not set'}{rep.email ? ` • ${rep.email}` : ''}</p>
                        <p className="mt-1 text-xs text-[#5b616e]">Authority: {rep.authorityScope || 'Not specified'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${statusTone(rep.isIdentityVerified)}`}>
                          {rep.isIdentityVerified ? 'Identity verified' : 'Pending verification'}
                        </span>
                        {!rep.isPrimaryOwner && (
                          <button type="button" onClick={() => removeRepresentative(rep.id)} className="rounded-full border border-[rgba(91,97,110,0.25)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors hover:border-[#b64141] hover:text-[#b64141]">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <form onSubmit={addRepresentative} className="mt-5 grid gap-3 rounded-[16px] border border-[rgba(91,97,110,0.2)] bg-[#fbfcff] p-4 md:grid-cols-2">
                <input
                  type="text"
                  value={newRep.fullName}
                  onChange={(e) => setNewRep((current) => ({ ...current, fullName: e.target.value }))}
                  placeholder="Representative name"
                  className="rounded-xl border border-[rgba(91,97,110,0.25)] px-4 py-2 text-sm outline-none focus:border-[#0052ff]"
                />
                <input
                  type="text"
                  value={newRep.designation}
                  onChange={(e) => setNewRep((current) => ({ ...current, designation: e.target.value }))}
                  placeholder="Designation"
                  className="rounded-xl border border-[rgba(91,97,110,0.25)] px-4 py-2 text-sm outline-none focus:border-[#0052ff]"
                />
                <input
                  type="email"
                  value={newRep.email}
                  onChange={(e) => setNewRep((current) => ({ ...current, email: e.target.value }))}
                  placeholder="Work email"
                  className="rounded-xl border border-[rgba(91,97,110,0.25)] px-4 py-2 text-sm outline-none focus:border-[#0052ff]"
                />
                <input
                  type="text"
                  value={newRep.authorityScope}
                  onChange={(e) => setNewRep((current) => ({ ...current, authorityScope: e.target.value }))}
                  placeholder="Authority scope"
                  className="rounded-xl border border-[rgba(91,97,110,0.25)] px-4 py-2 text-sm outline-none focus:border-[#0052ff]"
                />
                <label className="inline-flex items-center gap-2 text-sm text-[#5b616e] md:col-span-2">
                  <input
                    type="checkbox"
                    checked={newRep.isIdentityVerified}
                    onChange={(e) => setNewRep((current) => ({ ...current, isIdentityVerified: e.target.checked }))}
                    className="h-4 w-4 accent-[#0052ff]"
                  />
                  Mark representative identity as already verified
                </label>
                <div className="md:col-span-2">
                  <button type="submit" className="rounded-full bg-[#0052ff] px-5 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#0046d8]">
                    Add authorized representative
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[24px] border border-[rgba(91,97,110,0.18)] bg-white p-6">
              <h2 className="text-lg font-semibold">Direct communication controls</h2>
              <div className="mt-4 grid gap-3">
                {Object.entries(communicationLabels).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-4 rounded-[14px] border border-[rgba(91,97,110,0.2)] bg-[#f8f9fc] px-4 py-3 text-sm">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={state.communicationControls[key]}
                      onChange={() => toggleGroup('communicationControls', key)}
                      className="h-4 w-4 accent-[#0052ff]"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[rgba(91,97,110,0.18)] bg-white p-6">
              <h2 className="text-lg font-semibold">Escalation / verification checkpoints</h2>
              <div className="mt-4 grid gap-3">
                {Object.entries(escalationLabels).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-4 rounded-[14px] border border-[rgba(91,97,110,0.2)] bg-[#f8f9fc] px-4 py-3 text-sm">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={state.escalationCheckpoints[key]}
                      onChange={() => toggleGroup('escalationCheckpoints', key)}
                      className="h-4 w-4 accent-[#0052ff]"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-[rgba(91,97,110,0.18)] bg-white p-6">
              <h2 className="text-lg font-semibold">Anti-broker safeguards</h2>
              <div className="mt-4 grid gap-3">
                {Object.entries(antiBrokerLabels).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between gap-4 rounded-[14px] border border-[rgba(91,97,110,0.2)] bg-[#f8f9fc] px-4 py-3 text-sm">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={state.antiBrokerSafeguards[key]}
                      onChange={() => toggleGroup('antiBrokerSafeguards', key)}
                      className="h-4 w-4 accent-[#0052ff]"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setReportSubmitted(true)}
                className="mt-4 rounded-full border border-[#b64141]/40 bg-[#b64141]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#b64141] transition-colors hover:bg-[#b64141]/15"
              >
                Report suspicious intermediary
              </button>
              {reportSubmitted && (
                <p className="mt-2 text-xs text-[#1d8a4c]">Escalation ticket created for compliance review.</p>
              )}
            </div>

            <div className="rounded-[24px] border border-[rgba(91,97,110,0.18)] bg-[#0a0b0d] p-6 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a6b3d1]">Investment trust indicators</p>
              <div className="mt-3 grid gap-2 text-sm">
                <p>Owner verification checks completed: {Object.values(state.founderVerification).filter(Boolean).length} / {Object.keys(state.founderVerification).length}</p>
                <p>Verified representatives: {state.authorizedRepresentatives.filter((rep) => rep.isIdentityVerified).length} / {state.authorizedRepresentatives.length}</p>
                <p>Communication control coverage: {Object.values(state.communicationControls).filter(Boolean).length} / {Object.keys(state.communicationControls).length}</p>
                <p>Escalation readiness: {Object.values(state.escalationCheckpoints).filter(Boolean).length} / {Object.keys(state.escalationCheckpoints).length}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
