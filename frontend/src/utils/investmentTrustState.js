const INVESTMENT_TRUST_STORAGE_KEY = 'syncup.investmentTrust';

const defaultState = {
  founderVerification: {
    legalIdentityVerified: false,
    ownerKycVerified: false,
    capTableUploaded: false,
    liveVerificationCallDone: false,
  },
  authorizedRepresentatives: [
    {
      id: 'owner-primary',
      fullName: 'Primary Founder',
      designation: 'Founder',
      email: '',
      authorityScope: 'Full investment communication rights',
      isIdentityVerified: true,
      isPrimaryOwner: true,
    },
  ],
  communicationControls: {
    onlyVerifiedInvestorsCanMessage: true,
    ndaRequiredBeforeDataRoom: true,
    ownerMustApproveInvestmentCalls: true,
  },
  escalationCheckpoints: {
    suspiciousIntermediaryFlagEnabled: true,
    highValueDealRequiresSecondOwnerApproval: true,
    complianceReviewForRepresentativeChanges: true,
  },
  antiBrokerSafeguards: {
    noUnlistedIntermediaryAllowed: true,
    ownerDeclarationAccepted: false,
  },
};

function sanitizeState(input = {}) {
  return {
    founderVerification: {
      ...defaultState.founderVerification,
      ...(input.founderVerification || {}),
    },
    authorizedRepresentatives: Array.isArray(input.authorizedRepresentatives) && input.authorizedRepresentatives.length
      ? input.authorizedRepresentatives.map((rep, index) => ({
        id: rep.id || `rep-${index + 1}`,
        fullName: rep.fullName || '',
        designation: rep.designation || '',
        email: rep.email || '',
        authorityScope: rep.authorityScope || '',
        isIdentityVerified: Boolean(rep.isIdentityVerified),
        isPrimaryOwner: Boolean(rep.isPrimaryOwner),
      }))
      : [...defaultState.authorizedRepresentatives],
    communicationControls: {
      ...defaultState.communicationControls,
      ...(input.communicationControls || {}),
    },
    escalationCheckpoints: {
      ...defaultState.escalationCheckpoints,
      ...(input.escalationCheckpoints || {}),
    },
    antiBrokerSafeguards: {
      ...defaultState.antiBrokerSafeguards,
      ...(input.antiBrokerSafeguards || {}),
    },
  };
}

export function getInvestmentTrustState() {
  try {
    const raw = localStorage.getItem(INVESTMENT_TRUST_STORAGE_KEY);
    if (!raw) {
      return sanitizeState();
    }

    return sanitizeState(JSON.parse(raw));
  } catch {
    return sanitizeState();
  }
}

export function setInvestmentTrustState(patch = {}) {
  const current = getInvestmentTrustState();
  const next = sanitizeState({
    ...current,
    ...patch,
  });

  localStorage.setItem(INVESTMENT_TRUST_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetInvestmentTrustState() {
  localStorage.removeItem(INVESTMENT_TRUST_STORAGE_KEY);
}

export function calculateInvestmentTrustScore(state) {
  const model = sanitizeState(state);
  const founderChecks = Object.values(model.founderVerification).filter(Boolean).length;
  const founderMax = Object.keys(model.founderVerification).length;

  const verifiedRepresentatives = model.authorizedRepresentatives.filter((rep) => rep.isIdentityVerified).length;
  const representativeRatio = model.authorizedRepresentatives.length
    ? verifiedRepresentatives / model.authorizedRepresentatives.length
    : 0;

  const communicationChecks = Object.values(model.communicationControls).filter(Boolean).length;
  const escalationChecks = Object.values(model.escalationCheckpoints).filter(Boolean).length;
  const antiBrokerChecks = Object.values(model.antiBrokerSafeguards).filter(Boolean).length;

  const weightedScore = (
    (founderChecks / founderMax) * 0.35
    + representativeRatio * 0.25
    + (communicationChecks / Object.keys(model.communicationControls).length) * 0.15
    + (escalationChecks / Object.keys(model.escalationCheckpoints).length) * 0.15
    + (antiBrokerChecks / Object.keys(model.antiBrokerSafeguards).length) * 0.10
  );

  return Math.round(weightedScore * 100);
}
