import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setFlowState, setUser, getToken, getUser, logout } from '../../utils/flowState';
import { DiditSdk } from '@didit-protocol/sdk-web';
import { getCurrentUser } from '../../utils/api';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export default function FaceVerify() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const role = searchParams.get('role') || 'individual';
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [pipelineStatus, setPipelineStatus] = useState(null);
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');

	useEffect(() => {
		const currentUser = getUser();
		const rawName = (currentUser?.name || '').trim();
		const nameParts = rawName.split(/\s+/g).filter(Boolean);
		setFirstName(nameParts[0] || '');
		setLastName(nameParts.slice(1).join(' ') || '');
	}, []);

	async function sleep(ms) {
		return new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}

	async function pollVerifiedUser() {
		const timeoutMs = 30000;
		const intervalMs = 3000;
		const startedAt = Date.now();

		while (Date.now() - startedAt < timeoutMs) {
			try {
				const current = await getCurrentUser();
				if (current?.user?.identityVerified) {
					return current.user;
				}
			} catch {
			}

			await sleep(intervalMs);
		}

		return null;
	}

	async function handleCompleteVerification() {
		setError('');

		if (!getToken()) {
			setError('Session expired. Please sign in again.');
			navigate('/signin');
			return;
		}

		setLoading(true);
		setPipelineStatus('Preparing secure Didit verification...');

		try {
			const currentUser = getUser();
			const derivedFirstName = firstName.trim();
			const derivedLastName = lastName.trim();
			let extractedMobileNumber = '';

			if (!derivedFirstName) {
				setPipelineStatus(null);
				setLoading(false);
				setError('Profile name is missing. Please update your account name and retry.');
				return;
			}
			const sessionRes = await fetch(`${BASE_URL}/api/auth/didit-session`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${getToken()}`,
					...(currentUser?.id ? { 'x-user-id': currentUser.id } : {}),
				},
				body: JSON.stringify({ firstName: derivedFirstName, lastName: derivedLastName }),
			});

			const sessionData = await sessionRes.json().catch(() => ({}));
			if (!sessionRes.ok) {
				if (sessionRes.status === 401) {
					logout();
					setPipelineStatus(null);
					setLoading(false);
					setError('Your session expired. Please sign in again.');
					navigate('/signin');
					return;
				}
				const providerDetail = sessionData?.providerResponse?.detail || sessionData?.providerResponse?.message || sessionData?.providerResponse?.error;
				throw new Error(providerDetail || sessionData.error || 'Failed to start Didit verification');
			}

			const verificationUrl = sessionData.url || (sessionData.session_id ? `https://verify.didit.me/session/${sessionData.session_id}` : null);
			if (!verificationUrl) {
				throw new Error('Didit session response did not include verification URL');
			}

			setPipelineStatus('Launch complete. Finish verification in Didit window...');

			const completion = await new Promise((resolve) => {
				DiditSdk.shared.onComplete = (result) => {
					resolve(result);
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
			});

			if (completion?.type !== 'completed') {
				if (completion?.type === 'rejected' || completion?.type === 'failed' || completion?.status === 'rejected') {
					window.alert('Verification rejected. Please retry with a clear government ID and good lighting.');
				}
				setPipelineStatus(null);
				setError(completion?.type === 'cancelled'
					? 'Verification was cancelled.'
					: completion?.type === 'rejected'
						? 'Verification rejected by provider.'
						: (completion?.error?.message || 'Verification failed. Please try again.'));
				return;
			}

			// Local-dev note: webhooks can't reach localhost, so we actively sync via backend.
			setPipelineStatus('Syncing verification status...');
			try {
				const syncRes = await fetch(`${BASE_URL}/api/auth/didit-sync`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${getToken()}`,
						...(currentUser?.id ? { 'x-user-id': currentUser.id } : {}),
					},
					body: JSON.stringify({
						session_id: sessionData.session_id,
						firstName: derivedFirstName,
						lastName: derivedLastName,
					}),
				});
				const syncData = await syncRes.json().catch(() => ({}));
				extractedMobileNumber = String(syncData?.mobileNumber || '').trim();
				if (syncRes.status === 202) {
					const providerStatus = String(syncData?.status || '').toLowerCase();
					if (providerStatus.includes('reject') || providerStatus.includes('declin')) {
						setPipelineStatus(null);
						setError('Verification submitted, but sync is still pending. Please refresh shortly.');
						return;
					}
				}
				if (!syncRes.ok && syncRes.status !== 202) {
					throw new Error(syncData?.error || 'Failed to sync verification status');
				}
			} catch {
				// Fall through to polling /me below.
			}
			const verifiedUser = await pollVerifiedUser();

			if (!verifiedUser) {
				setPipelineStatus(null);
				setError('Verification submitted, but sync is still pending. Please refresh shortly.');
				return;
			}

			setUser({
				...verifiedUser,
				identityVerified: true,
				...(extractedMobileNumber ? { mobileNumber: extractedMobileNumber, mobile: extractedMobileNumber } : {}),
			});
			setFlowState({
				isAuthenticated: true,
				idVerified: true,
				faceVerified: true,
				role,
			});

			setPipelineStatus('Verified successfully!');
			setTimeout(() => navigate('/setup/profile'), 600);
		} catch (err) {
			setPipelineStatus(null);
			setError(err.message || 'Verification failed. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen bg-[#f5f7fb] px-6 py-10 text-[#0a0b0d] lg:px-10">
			<div className="mx-auto grid w-full max-w-[1180px] gap-6 rounded-[32px] border border-[rgba(91,97,110,0.18)] bg-white p-6 shadow-[0_24px_70px_rgba(10,11,13,0.08)] lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
				<section className="rounded-[28px] border border-[rgba(91,97,110,0.18)] bg-[#0a0b0d] p-6 text-white lg:p-8">
					<div className="mb-5 flex items-center justify-between gap-3">
						<button
							type="button"
							onClick={() => { navigate(-1); }}
							className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/20"
						>
							Back
						</button>
						<span className="rounded-full bg-[#0052ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white">
							Step 1 of 3
						</span>
					</div>

					<h1 className="text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[48px]">
						Didit verification
					</h1>
					<p className="mt-3 max-w-[560px] text-[16px] leading-[1.6] text-white/76">
						ID document upload and live selfie are handled only once inside Didit.
					</p>

					<div className="mt-8 rounded-[26px] border border-white/14 bg-white/6 p-6">
						<p className="text-sm text-white/80">
							No local document upload or local selfie capture is required now.
							Click Complete Verification to open Didit and finish verification there.
						</p>
						<div className="mt-5 grid gap-3 sm:grid-cols-3">
							<div className="rounded-2xl border border-white/14 bg-white/5 p-4">
								<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a6b3d1]">Document</p>
								<p className="mt-2 text-sm text-white/80">Upload your government ID in Didit.</p>
							</div>
							<div className="rounded-2xl border border-white/14 bg-white/5 p-4">
								<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a6b3d1]">Liveness</p>
								<p className="mt-2 text-sm text-white/80">Capture live selfie in Didit.</p>
							</div>
							<div className="rounded-2xl border border-white/14 bg-white/5 p-4">
								<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a6b3d1]">Duration</p>
								<p className="mt-2 text-sm text-white/80">Processing may take 10–30s.</p>
							</div>
						</div>
					</div>
				</section>

				<section className="rounded-[28px] border border-[rgba(91,97,110,0.18)] bg-[#f8f9fc] p-6 lg:p-8">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5b616e]">Verification status</p>
					<h2 className="mt-3 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#0a0b0d]">
						{loading ? 'Verifying...' : 'Ready'}
					</h2>
					<p className="mt-3 text-[15px] leading-[1.6] text-[#5b616e]">
						Once verified, your profile gets a trusted badge and access to secure networking actions.
					</p>

					<div className="mt-8 space-y-3">
						<div className="rounded-2xl border border-green-400/40 bg-green-50 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.12em] text-green-600">Account</p>
							<p className="mt-2 text-sm font-semibold text-[#0a0b0d]">✓ Registered</p>
						</div>
						<div className="rounded-2xl border border-green-400/40 bg-green-50 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.12em] text-green-600">ID uploaded</p>
							<p className="mt-2 text-sm font-semibold text-[#0a0b0d]">Inside Didit flow</p>
						</div>
						<div className="rounded-2xl border border-[#0052ff]/40 bg-[#0052ff]/8 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0052ff]">Live selfie</p>
							<p className="mt-2 text-sm font-semibold text-[#0a0b0d]">Inside Didit flow</p>
						</div>
						<div className="rounded-2xl border border-[rgba(91,97,110,0.18)] bg-white p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Access</p>
							<p className="mt-2 text-sm font-semibold text-[#0a0b0d]">Unlock after successful verification</p>
						</div>
					</div>

					{pipelineStatus && (
						<div className="mt-4 flex items-center gap-3 rounded-2xl border border-[#0052ff]/30 bg-[#0052ff]/8 px-4 py-3">
							<div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0052ff] border-t-transparent" />
							<p className="text-sm font-medium text-[#0052ff]">{pipelineStatus}</p>
						</div>
					)}

					{error && (
						<div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
							{error}
						</div>
					)}

					<div className="mt-6 grid gap-3 sm:grid-cols-2">
						<label className="space-y-1">
							<span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5b616e]">First name (as on ID)</span>
							<input
								value={firstName}
								readOnly
								autoComplete="given-name"
								className="w-full rounded-2xl border border-[rgba(91,97,110,0.18)] bg-gray-100 px-4 py-3 text-sm font-medium text-[#0a0b0d] outline-none"
								placeholder="Auto-filled"
							/>
						</label>

						<label className="space-y-1">
							<span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5b616e]">Last name (as on ID)</span>
							<input
								value={lastName}
								readOnly
								autoComplete="family-name"
								className="w-full rounded-2xl border border-[rgba(91,97,110,0.18)] bg-gray-100 px-4 py-3 text-sm font-medium text-[#0a0b0d] outline-none"
								placeholder="Auto-filled"
							/>
						</label>
					</div>

					<button
						type="button"
						onClick={handleCompleteVerification}
						disabled={loading || !firstName.trim()}
						className="mt-8 w-full rounded-full bg-[#0052ff] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0046d8] disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Running verification pipeline...' : 'Complete Verification'}
					</button>
					<button
						type="button"
						onClick={() => { navigate('/signin'); }}
						className="mt-3 w-full rounded-full border border-[rgba(91,97,110,0.25)] px-5 py-3.5 text-sm font-semibold text-[#0a0b0d] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]"
					>
						Save and continue later
					</button>
				</section>
			</div>
		</div>
	);
}
