import { useEffect, useMemo, useState } from 'react';
import { DiditSdk } from '@didit-protocol/sdk-web';
import { ShieldCheck, ScanFace, IdCard, X } from 'lucide-react';
import { getToken } from '../utils/flowState';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function requestDiditSession(userId, { firstName, lastName } = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}/api/auth/didit-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ firstName, lastName }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'Failed to initialize identity verification');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function requestCurrentUser() {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'Failed to fetch current user');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function pollForVerifiedStatus({ timeoutMs = 30000, intervalMs = 3000 } = {}) {
  const startAt = Date.now();

  while (Date.now() - startAt < timeoutMs) {
    try {
      const me = await requestCurrentUser();
      if (me?.user?.identityVerified) {
        return me.user;
      }
    } catch {
    }

    await sleep(intervalMs);
  }

  return null;
}

function buildVerificationUrl(sessionData) {
  if (sessionData.url) {
    return sessionData.url;
  }

  if (sessionData.session_id) {
    return `https://verify.didit.me/session/${sessionData.session_id}`;
  }

  throw new Error('Didit session response is missing verification URL and session_id');
}

export default function DiditVerificationModal({ isOpen, currentUser, onClose, onVerificationPending, onVerified }) {
  const [isStarting, setIsStarting] = useState(false);
  const [isAwaitingSync, setIsAwaitingSync] = useState(false);
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const canStart = useMemo(
    () =>
      Boolean(currentUser?.id) &&
      !isStarting &&
      !isAwaitingSync &&
      Boolean(firstName.trim()) &&
      Boolean(lastName.trim()),
    [currentUser?.id, isStarting, isAwaitingSync, firstName, lastName]
  );

  useEffect(() => {
    if (!isOpen) {
      setIsStarting(false);
      setIsAwaitingSync(false);
      setError('');
      setFirstName('');
      setLastName('');
      DiditSdk.shared.close();
      return;
    }

    return () => {
      DiditSdk.shared.close();
    };
  }, [isOpen]);

  async function startVerification() {
    if (!currentUser?.id || !canStart) {
      return;
    }

    setError('');
    setIsStarting(true);

    try {
      const sessionData = await requestDiditSession(currentUser.id, { firstName: firstName.trim(), lastName: lastName.trim() });
      const verificationUrl = buildVerificationUrl(sessionData);

      DiditSdk.shared.onComplete = async (result) => {
        if (result?.type === 'completed') {
          setIsAwaitingSync(true);
          setIsStarting(false);
          onVerificationPending?.({
            sessionId: result?.session?.sessionId || sessionData.session_id,
            status: result?.session?.status || 'Pending',
          });

          const verifiedUser = await pollForVerifiedStatus({ timeoutMs: 30000, intervalMs: 3000 });
          if (verifiedUser) {
            setIsAwaitingSync(false);
            onVerified?.(verifiedUser);
            onClose?.();
            return;
          }

          setIsAwaitingSync(false);
          setError('Verification submitted. Sync can take a bit longer; refresh shortly if status does not update.');
          return;
        }

        if (result?.type === 'cancelled') {
          setIsStarting(false);
          return;
        }

        if (result?.type === 'failed') {
          setIsStarting(false);
          setError(result?.error?.message || 'Verification failed. Please try again.');
        }
      };

      DiditSdk.shared.startVerification({
        url: verificationUrl,
        configuration: {
          showCloseButton: true,
          showExitConfirmation: true,
          closeModalOnComplete: true,
          loggingEnabled: false,
        },
      });
    } catch (err) {
      setIsStarting(false);
      setError(err.message || 'Unable to start verification right now.');
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-100 shadow-[0_20px_80px_rgba(15,23,42,0.65)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="border-b border-slate-800/90 px-8 pb-6 pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Identity Check</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Verify with Government ID and Active Liveness</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Complete a secure two-step flow with your government-issued ID and a 3D facial liveness scan.
          </p>
        </div>

        <div className="space-y-4 px-8 py-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">First Name</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
                placeholder="Enter first name"
                autoComplete="given-name"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Last Name</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"
                placeholder="Enter last name"
                autoComplete="family-name"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-cyan-400/10 p-2 text-cyan-300">
                <IdCard size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Document Verification</p>
                <p className="mt-1 text-xs text-slate-400">Upload and validate your government-issued ID document.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-400/10 p-2 text-emerald-300">
                <ScanFace size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Active Liveness</p>
                <p className="mt-1 text-xs text-slate-400">Perform a 3D flash facial scan for anti-spoof verification.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-cyan-300" />
              <p className="text-xs text-slate-300">Your status updates automatically when webhook processing completes.</p>
            </div>
          </div>

          {error ? <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{error}</p> : null}

          {isAwaitingSync ? (
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-cyan-200">Synchronizing</p>
              <p className="mt-1 text-sm text-cyan-100">Verification submitted. Waiting for backend confirmation.</p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800/90 px-8 py-5">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
          >
            Not Now
          </button>

          <button
            onClick={startVerification}
            disabled={!canStart}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-all hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStarting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" /> : null}
            {isStarting ? 'Launching Secure Flow...' : isAwaitingSync ? 'Waiting for Confirmation...' : 'Verify Identity'}
          </button>
        </div>
      </div>
    </div>
  );
}
