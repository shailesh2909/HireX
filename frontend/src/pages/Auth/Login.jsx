import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ensureReferralProfile, getFlowState, setFlowState, setToken, setUser, getToken, getUser } from '../../utils/flowState';
import { loginUser, getCurrentUser } from '../../utils/api';

export default function Login() {
	const navigate = useNavigate();
	const [selectedRole, setSelectedRole] = useState(getFlowState().role || 'individual');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	async function handleSignIn() {
		setError('');

		if (!email || !password) {
			setError('Please enter your email and password.');
			return;
		}

		setLoading(true);

		try {
			const res = await loginUser({ email, password });

			setToken(res.token);
			setUser(res.user);

			const role = res.user.role || selectedRole;
			setFlowState({ role });
			ensureReferralProfile(role);

			if (role === 'business') {
				setFlowState({
					isAuthenticated: true,
					role,
				});
				navigate('/home');
			} else {
				if (res.user.identityVerified) {
					setFlowState({
						isAuthenticated: true,
						idVerified: true,
						faceVerified: true,
						role,
					});
					navigate('/home');
				} else {
					setFlowState({
						isAuthenticated: true,
						idVerified: false,
						faceVerified: false,
						role,
					});
					navigate(`/upload-id?role=${role}`);
				}
			}
		} catch (err) {
			setError(err.message || 'Login failed. Please check your credentials.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen bg-[#f5f7fb] px-6 py-10 text-[#0a0b0d] lg:px-10">
			<div className="mx-auto grid w-full max-w-[1180px] overflow-hidden rounded-[32px] border border-[rgba(91,97,110,0.18)] bg-white shadow-[0_20px_60px_rgba(10,11,13,0.08)] lg:grid-cols-[0.95fr_1.05fr]">
				<section className="relative overflow-hidden bg-[#0a0b0d] p-8 text-white lg:p-12">
					<div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#0052ff]/30 blur-3xl" />
					<div className="absolute -bottom-16 -left-10 h-52 w-52 rounded-full bg-white/10 blur-3xl" />

					<div className="relative z-10">
						<button
							type="button"
							onClick={() => navigate('/')}
							className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
						>
							Back to home
						</button>

						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a6b3d1]">SyncUp Access</p>
						<h1 className="mt-4 max-w-[420px] text-[42px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[54px]">
							Welcome back to verified networking.
						</h1>
						<p className="mt-5 max-w-[440px] text-[17px] leading-[1.6] text-white/76">
							Sign in to continue building trusted connections, discover real opportunities, and manage your verified profile.
						</p>

						<div className="mt-10 space-y-3 rounded-[24px] border border-white/14 bg-white/6 p-5">
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a6b3d1]">Trust promise</p>
							<p className="text-lg font-semibold">Only verified people. Only accountable growth.</p>
						</div>
					</div>
				</section>

				<section className="p-8 lg:p-12">
					<div className="mx-auto w-full max-w-[460px]">
						<p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5b616e]">Sign In</p>
						<h2 className="mt-3 text-[36px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0a0b0d]">
							Continue your journey
						</h2>
						<p className="mt-3 text-[16px] leading-[1.6] text-[#5b616e]">
							Login with your registered account. If you are new, create an individual or business account first.
						</p>

						<div className="mt-6 inline-flex overflow-hidden rounded-full border border-[rgba(91,97,110,0.2)] bg-[#eef0f3] p-1">
							<button
								type="button"
								onClick={() => setSelectedRole('individual')}
								className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${selectedRole === 'individual' ? 'bg-[#0052ff] text-white' : 'text-[#5b616e] hover:text-[#0a0b0d]'}`}
							>
								Individual Login
							</button>
							<button
								type="button"
								onClick={() => setSelectedRole('business')}
								className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${selectedRole === 'business' ? 'bg-[#0052ff] text-white' : 'text-[#5b616e] hover:text-[#0a0b0d]'}`}
							>
								Business Login
							</button>
						</div>

						{error && (
							<div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
								{error}
							</div>
						)}

						<form className="mt-8 space-y-5">
							<div className="space-y-2">
								<label htmlFor="email" className="text-sm font-semibold text-[#0a0b0d]">
									Email address
								</label>
								<input
									id="email"
									type="email"
									placeholder="you@company.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] bg-white px-4 py-3 text-[15px] outline-none transition-colors focus:border-[#0052ff]"
								/>
							</div>

							<div className="space-y-2">
								<label htmlFor="password" className="text-sm font-semibold text-[#0a0b0d]">
									Password
								</label>
								<input
									id="password"
									type="password"
									placeholder="Enter your password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full rounded-2xl border border-[rgba(91,97,110,0.25)] bg-white px-4 py-3 text-[15px] outline-none transition-colors focus:border-[#0052ff]"
								/>
							</div>

							<div className="flex items-center justify-between gap-3 pt-1 text-sm">
								<label className="inline-flex items-center gap-2 text-[#5b616e]">
									<input type="checkbox" className="h-4 w-4 accent-[#0052ff]" />
									Keep me signed in
								</label>
								<button type="button" className="font-semibold text-[#0052ff] hover:underline">
									Forgot password?
								</button>
							</div>

							<button
								type="button"
								onClick={handleSignIn}
								disabled={loading}
								className="w-full rounded-full bg-[#0052ff] px-5 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#0046d8] disabled:opacity-60 disabled:cursor-not-allowed"
							>
								{loading ? 'Signing in...' : 'Sign in securely'}
							</button>
						</form>

						<div className="my-8 flex items-center gap-4">
							<span className="h-px flex-1 bg-[rgba(91,97,110,0.24)]" />
							<span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b616e]">New here?</span>
							<span className="h-px flex-1 bg-[rgba(91,97,110,0.24)]" />
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							<button
								type="button"
								onClick={() => navigate('/signup/individual')}
								className="rounded-full border border-[#0052ff] px-4 py-3 text-sm font-semibold text-[#0052ff] transition-colors hover:bg-[#0052ff] hover:text-white"
							>
								Join as Individual
							</button>
							<button
								type="button"
								onClick={() => navigate('/signup/business')}
								className="rounded-full border border-[rgba(91,97,110,0.25)] px-4 py-3 text-sm font-semibold text-[#0a0b0d] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]"
							>
								Join as Business
							</button>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
