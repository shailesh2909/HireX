const FLOW_STORAGE_KEY = 'syncup.authFlow';
const REFERRAL_STORAGE_KEY = 'syncup.referralProfile';
const TOKEN_KEY = 'syncup.token';
const USER_KEY = 'syncup.user';

const defaultState = {
  isAuthenticated: false,
  idVerified: false,
  faceVerified: false,
  role: 'individual',
};

export function getFlowState() {
  try {
    const raw = localStorage.getItem(FLOW_STORAGE_KEY);
    if (!raw) {
      return { ...defaultState };
    }

    const parsed = JSON.parse(raw);
    return {
      ...defaultState,
      ...parsed,
    };
  } catch {
    return { ...defaultState };
  }
}

export function setFlowState(patch) {
  const current = getFlowState();
  const next = {
    ...current,
    ...patch,
  };

  localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetFlowState() {
  localStorage.removeItem(FLOW_STORAGE_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  const possibleKeys = [
    TOKEN_KEY,
    'syncup.authToken',
    'authToken',
    'token',
  ];

  for (const key of possibleKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      continue;
    }

    const cleaned = String(raw).trim().replace(/^"+|"+$/g, '');
    if (!cleaned) {
      continue;
    }

    if (cleaned.startsWith('Bearer ')) {
      return cleaned.slice(7).trim();
    }

    return cleaned;
  }

  return null;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

export function logout() {
  clearToken();
  clearUser();
  resetFlowState();
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
  localStorage.removeItem('syncup.appData');
}

function generateReferralCode(role = 'individual') {
  const prefix = role === 'business' ? 'BIZ' : 'USR';
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${random}`;
}

export function getReferralProfile() {
  try {
    const raw = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!raw) {
      const next = {
        role: getCurrentRole(),
        referralCode: generateReferralCode(getCurrentRole()),
        referredBy: '',
        totalReferrals: 0,
        rewardPoints: 0,
      };
      localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(next));
      return next;
    }

    const parsed = JSON.parse(raw);
    return {
      role: parsed.role || getCurrentRole(),
      referralCode: parsed.referralCode || generateReferralCode(parsed.role || getCurrentRole()),
      referredBy: parsed.referredBy || '',
      totalReferrals: Number.isFinite(parsed.totalReferrals) ? parsed.totalReferrals : 0,
      rewardPoints: Number.isFinite(parsed.rewardPoints) ? parsed.rewardPoints : 0,
    };
  } catch {
    return {
      role: getCurrentRole(),
      referralCode: generateReferralCode(getCurrentRole()),
      referredBy: '',
      totalReferrals: 0,
      rewardPoints: 0,
    };
  }
}

export function initializeReferralProfile({ role = 'individual', referredBy = '' } = {}) {
  const next = {
    role,
    referralCode: generateReferralCode(role),
    referredBy,
    totalReferrals: 0,
    rewardPoints: referredBy ? 100 : 0,
  };

  localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function ensureReferralProfile(role = 'individual') {
  const current = getReferralProfile();
  if (current.referralCode) {
    return current;
  }

  return initializeReferralProfile({ role });
}

export function getCurrentRole() {
  return getFlowState().role || 'individual';
}

export function isBusinessRole() {
  return getCurrentRole() === 'business';
}
