import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { initializeReferralProfile, setFlowState, setToken, setUser } from '../../utils/flowState';
import { createDiditPreSession, registerUser, syncDiditPreSession } from '../../utils/api';
import { DiditSdk } from '@didit-protocol/sdk-web';

export default function Register() {
	const navigate = useNavigate();
	const { role = 'individual' } = useParams();
	const isBusiness = role === 'business';
	const [referralInput, setReferralInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [diditLoading, setDiditLoading] = useState(false);
	const [diditStatus, setDiditStatus] = useState('');
	const [diditVerified, setDiditVerified] = useState(false);
	const [diditVerificationToken, setDiditVerificationToken] = useState('');
	const [idPhoneNumber, setIdPhoneNumber] = useState('');
	const [isGovernmentDataLocked, setIsGovernmentDataLocked] = useState(true);
	const [error, setError] = useState('');
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		password: '',
		companyName: '',
	});

	async function sleep(ms) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async function handleStartDiditVerification() {
		setError('');
		setDiditLoading(true);
		setDiditStatus('Preparing Didit verification...');
		try {
			const session = await createDiditPreSession();
			const verificationUrl = session?.url || (session?.session_id ? `https://verify.didit.me/session/${session.session_id}` : null);
			if (!verificationUrl || !session?.state_id || !session?.session_id) {
				throw new Error('Didit session creation failed. Please try again.');
			}

			setDiditStatus('Didit window opened. Complete verification there...');
			const completion = await new Promise((resolve) => {
				DiditSdk.shared.onComplete = (result) => resolve(result);
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
				throw new Error('Didit verification was not completed.');
			}

			setDiditStatus('Syncing verified ID details...');
			for (let attempt = 0; attempt < 12; attempt += 1) {
				const sync = await syncDiditPreSession({
					stateId: session.state_id,
					sessionId: session.session_id,
				});
				console.log('Didit pre-sync response:', sync);
				if (sync?.verificationToken && sync?.firstName && sync?.lastName) {
					const fullName = `${sync.firstName} ${sync.lastName}`.trim();
					setDiditVerificationToken(sync.verificationToken);
					setDiditVerified(true);
					setIsGovernmentDataLocked(true);
					setIdPhoneNumber(sync.mobileNumber || '');
					setFormData((prev) => ({
						...prev,
						name: fullName,
					}));
					setDiditStatus('Verification complete. Continue registration.');
					setDiditLoading(false);
					return;
				}
				if (sync?.status === 'approved_pending_ocr' || sync?.reason === 'ocr_missing') {
					setDiditVerified(true);
					setIsGovernmentDataLocked(false);
					setDiditStatus('Verification complete. ID name not available from Didit, please fill details manually.');
					setDiditLoading(false);
					return;
				}
				await sleep(2000);
			}

			throw new Error('Verification submitted, but sync is still pending. Please retry in a few seconds.');
		} catch (err) {
			setDiditStatus('');
			setError(err.message || 'Didit verification failed. Please retry.');
		} finally {
			setDiditLoading(false);
		}
	}

	async function handleContinueToId() {
		setError('');

		if (!formData.email || !formData.password) {
			setError('Please fill in all required fields.');
			return;
		}
		if (!isBusiness && (!diditVerified || !formData.name)) {
			setError('Complete Didit verification first.');
			return;
		}

		setLoading(true);

		try {
			const resolvedRole = isBusiness ? 'business' : 'individual';
			const referredBy = referralInput.trim().toUpperCase();

			const res = await registerUser({
				name: formData.name,
				email: formData.email,
				password: formData.password,
				role: resolvedRole,
				companyName: isBusiness ? formData.companyName : undefined,
				diditVerificationToken: (isBusiness || !isGovernmentDataLocked) ? undefined : diditVerificationToken,
			});

			setToken(res.token);
			setUser({
				...res.user,
				...(idPhoneNumber ? { mobileNumber: idPhoneNumber, mobile: idPhoneNumber } : {}),
			});

			setFlowState({
				isAuthenticated: true,
				idVerified: resolvedRole === 'individual',
				faceVerified: resolvedRole === 'individual',
				role: resolvedRole,
			});

			initializeReferralProfile({
				role: resolvedRole,
				referredBy,
			});

			if (resolvedRole === 'business') {
				navigate('/setup/business');
			} else {
				navigate('/home');
			}
		} catch (err) {
			setError(err.message || 'Registration failed. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen bg-[#f5f7fb] px-6 py-10 text-[#0a0b0d] lg:px-10">
			<div className="mx-auto grid w-full max-w-[1220px] overflow-hidden rounded-[32px] border border-[rgba(91,97,110,0.18)] bg-white shadow-[0_24px_70px_rgba(10,11,13,0.08)] lg:grid-cols-[1.05fr_0.95fr]">
				<section className="p-8 lg:p-12">
					<div className="mx-auto w-full max-w-[520px]">
						<button
							type="button"
							onClick={() => navigate('/signin')}
							className="mb-8 inline-flex items-center gap-2 rounded-full border border-[rgba(91,97,110,0.25)] bg-white px-4 py-2 text-sm font-semibold text-[#0a0b0d] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]"
						>
							Back to sign in
						</button>

						<div className="inline-flex overflow-hidden rounded-full border border-[rgba(91,97,110,0.2)] bg-[#eef0f3] p-1">
							<button
								type="button"
								onClick={() => navigate('/signup/individual')}
								className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${!isBusiness ? 'bg-[#0052ff] text-white' : 'text-[#5b616e] hover:text-[#0a0b0d]'}`}
							>
								Individual
							</button>
							<button
								type="button"
								onClick={() => navigate('/signup/business')}
								className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${isBusiness ? 'bg-[#0052ff] text-white' : 'text-[#5b616e] hover:text-[#0a0b0d]'}`}
							>
								Business
							</button>
						</div>

						<h1 className="mt-6 text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#0a0b0d] sm:text-[50px]">
							{isBusiness ? 'Create your verified business account' : 'Create your verified professional account'}
						</h1>
						<p className="mt-4 text-[16px] leading-[1.6] text-[#5b616e]">
							{isBusiness
								? 'Register your company to post verified opportunities, hire trusted talent, and collaborate with confidence.'
								: 'Join as an individual to build your profile, connect with verified professionals, and unlock quality opportunities.'}
						</p>

						{error && (
							<div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
								{error}
							</div>
						)}

						{!isBusiness && !diditVerified && (
							<div className="mt-8 rounded-2xl border border-[rgba(0,82,255,0.28)] bg-[#0052ff]/5 p-5">
								<p className="text-sm font-semibold text-[#0a0b0d]">Step 1: Didit verification</p>
								<p className="mt-2 text-sm text-[#5b616e]">
									Complete Didit verification first. Registration form unlocks after successful government ID verification.
								</p>
								{diditStatus && <p className="mt-3 text-sm font-medium text-[#0052ff]">{diditStatus}</p>}
								<button
									type="button"
									onClick={handleStartDiditVerification}
									disabled={diditLoading}
									className="mt-4 rounded-full bg-[#0052ff] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0046d8] disabled:opacity-60 disabled:cursor-not-allowed"
								>
									{diditLoading ? 'Opening Didit...' : 'Retry Didit verification'}
								</button>
							</div>
						)}

						{(isBusiness || diditVerified) && (
						<form className="mt-8 grid gap-5 sm:grid-cols-2">
							<div className="space-y-2 sm:col-span-2">
								<label htmlFor="name" className="text-sm font-semibold text-[#0a0b0d]">
									Full name
								</label>
								<input
									id="name"
									type="text"
									placeholder={isBusiness ? 'Enter your full name' : 'Fetched from government ID'}
									value={formData.name}
									onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
									readOnly={!isBusiness && isGovernmentDataLocked}
									className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors ${(!isBusiness && isGovernmentDataLocked) ? 'cursor-not-allowed border-[rgba(91,97,110,0.2)] bg-[#f3f5f8] text-[#5b616e]' : 'border-[rgba(91,97,110,0.25)] focus:border-[#0052ff]'}`}
								/>
							</div>

							{!isBusiness && (
								<div className="space-y-2 sm:col-span-2">
									<label htmlFor="idPhone" className="text-sm font-semibold text-[#0a0b0d]">
										Phone number from ID
									</label>
									<input
										id="idPhone"
										type="text"
										value={idPhoneNumber}
										onChange={(e) => setIdPhoneNumber(e.target.value)}
										readOnly={isGovernmentDataLocked}
										placeholder={isGovernmentDataLocked ? 'Not provided by Didit' : 'Enter phone number'}
										className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none ${isGovernmentDataLocked ? 'cursor-not-allowed border-[rgba(91,97,110,0.2)] bg-[#f3f5f8] text-[#5b616e]' : 'border-[rgba(91,97,110,0.25)] focus:border-[#0052ff]'}`}
									/>
									<p className="text-xs text-[#5b616e]">
										{isGovernmentDataLocked ? 'Fetched from Didit and locked.' : 'Didit did not provide this value, please enter manually.'}
									</p>
								</div>
							)}

							<div className="space-y-2 sm:col-span-1">
								<label htmlFor="email" className="text-sm font-semibold text-[#0a0b0d]">
									Email address
								</label>
								<input
									id="email"
									type="email"
									placeholder="you@company.com"
									value={formData.email}
									onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
									className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#0052ff]"
								/>
							</div>

							<div className="space-y-2 sm:col-span-1">
								<label htmlFor="password" className="text-sm font-semibold text-[#0a0b0d]">
									Password
								</label>
								<input
									id="password"
									type="password"
									placeholder="Create a strong password"
									value={formData.password}
									onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
									className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#0052ff]"
								/>
							</div>

							{isBusiness && (
								<div className="space-y-2 sm:col-span-2">
									<label htmlFor="companyName" className="text-sm font-semibold text-[#0a0b0d]">
										Company name
									</label>
									<input
										id="companyName"
										type="text"
										placeholder="Enter company legal name"
										value={formData.companyName}
										onChange={(e) => setFormData((prev) => ({ ...prev, companyName: e.target.value }))}
										className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm outline-none transition-colors focus:border-[#0052ff]"
									/>
								</div>
							)}

							<div className="space-y-2 sm:col-span-2">
								<label htmlFor="referralCode" className="text-sm font-semibold text-[#0a0b0d]">
									Referral code (optional)
								</label>
								<input
									id="referralCode"
									type="text"
									placeholder="Enter referral code if you have one"
									value={referralInput}
									onChange={(e) => setReferralInput(e.target.value)}
									className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm uppercase outline-none transition-colors focus:border-[#0052ff]"
								/>
							</div>

							<label className="inline-flex items-start gap-3 text-sm text-[#5b616e] sm:col-span-2">
								<input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#0052ff]" />
								I agree to the Terms and Privacy Policy. I understand that account actions are tied to verified identity.
							</label>

							<div className="sm:col-span-2">
								<button
									type="button"
									onClick={handleContinueToId}
									disabled={loading || (!isBusiness && !diditVerified)}
									className="w-full rounded-full bg-[#0052ff] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#0046d8] disabled:opacity-60 disabled:cursor-not-allowed"
								>
									{loading ? 'Creating account...' : 'Complete registration'}
								</button>
							</div>
						</form>
						)}
					</div>
				</section>

				<section className="relative overflow-hidden bg-[#0a0b0d] p-8 text-white lg:p-12">
					<div className="absolute -right-10 -top-8 h-44 w-44 rounded-full bg-[#0052ff]/25 blur-3xl" />
					<div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

					<div className="relative z-10 flex h-full flex-col justify-between gap-8">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a6b3d1]">Why verification matters</p>
							<h2 className="mt-4 text-[40px] font-semibold leading-[1.06] tracking-[-0.03em] sm:text-[50px]">
								Trust starts before the first connection.
							</h2>
							<p className="mt-5 max-w-[460px] text-[16px] leading-[1.6] text-white/76">
								SyncUp verifies humans and businesses first, so people spend time on meaningful opportunities instead of fake profiles.
							</p>
						</div>

						<div className="space-y-4">
							<div className="rounded-[24px] border border-white/14 bg-white/6 p-5">
								<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a6b3d1]">Step 1</p>
								<p className="mt-2 text-lg font-semibold">Didit verification</p>
								<p className="mt-1 text-sm text-white/72">Upload government ID and complete liveness in Didit.</p>
							</div>
							<div className="rounded-[24px] border border-white/14 bg-white/6 p-5">
								<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a6b3d1]">Step 2</p>
								<p className="mt-2 text-lg font-semibold">Image process</p>
								<p className="mt-1 text-sm text-white/72">Complete profile details after Didit verification. Name is locked from ID data.</p>
							</div>
							<div className="rounded-[24px] border border-white/14 bg-white/6 p-5">
								<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a6b3d1]">Step 3</p>
								<p className="mt-2 text-lg font-semibold">Verification completed</p>
								<p className="mt-1 text-sm text-white/72">Finish onboarding and continue to the dashboard.
								</p>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
