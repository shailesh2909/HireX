import React, { useMemo, useState } from 'react';
import { getReferralProfile } from '../utils/flowState';
import { claimReferralMilestone, getReferralData, redeemCoupon } from '../utils/appData';
import DashboardNavbar from '../components/DashboardNavbar';
import { PostSkeleton } from '../components/Skeleton';
import { useEffect } from 'react';

function RewardMetric({ label, value, tone = 'default' }) {
  const toneClass = tone === 'primary'
    ? 'border-[#0052ff]/25 bg-[#0052ff]/5 text-[#0052ff]'
    : 'border-[#e2e8f0] bg-white text-[#0a0b0d]';

  return (
    <article className={`rounded-sm border p-6 shadow-sm ${toneClass}`}>
      <p className={`text-[11px] font-bold uppercase tracking-[0.15em] ${tone === 'primary' ? 'text-[#0052ff]/80' : 'text-[#5b616e]'}`}>{label}</p>
      <p className="mt-3 text-[32px] font-bold leading-none">{value}</p>
    </article>
  );
}

export default function ReferralRewards() {
  const referralProfile = useMemo(() => getReferralProfile(), []);
  const [refreshKey, setRefreshKey] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const referralData = useMemo(() => getReferralData(), [refreshKey]);

  const rewardTier = referralProfile.rewardPoints >= 500
    ? 'Gold'
    : referralProfile.rewardPoints >= 200
      ? 'Silver'
      : 'Starter';

  function copyReferralCode() {
    navigator.clipboard.writeText(referralProfile.referralCode);
    setStatusMessage('Referral code copied.');
  }

  function refresh() {
    setRefreshKey((value) => value + 1);
  }

  function handleRedeemCoupon() {
    const result = redeemCoupon(couponCode);
    setStatusMessage(result.message);
    if (result.ok) {
      setCouponCode('');
      refresh();
    }
  }

  function handleMilestoneClaim(tier, requiredReferrals) {
    const result = claimReferralMilestone(tier, requiredReferrals);
    setStatusMessage(result.message);
    if (result.ok) {
      refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eaf0ff_0%,#f5f7fb_45%,#f5f7fb_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1180px] space-y-6">
        <DashboardNavbar activePath="/referral-rewards" />

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : (
          <>
            <header className="rounded-sm border border-[#e2e8f0] bg-white px-8 py-8 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5b616e]">Referral & Rewards</p>
              <h1 className="mt-2 text-[36px] font-bold leading-tight tracking-[-0.02em] text-[#0a0b0d]">Grow your network, earn rewards</h1>
              <p className="mt-3 max-w-[760px] text-[16px] leading-[1.6] text-[#5b616e]">Share your personal referral code and unlock reward points when your invited users complete verification.</p>
            </header>

            <section className="rounded-sm border border-[#e2e8f0] bg-white p-8 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5b616e]">How rewards work</p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-sm bg-[#fafbfd] p-5 border border-[#e2e8f0]">
                  <p className="text-[15px] font-bold text-[#0a0b0d]">Invite with your code</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#5b616e]">Share your personal referral code with professionals or businesses.</p>
                </div>
                <div className="rounded-sm bg-[#fafbfd] p-5 border border-[#e2e8f0]">
                  <p className="text-[15px] font-bold text-[#0a0b0d]">Verification completed</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#5b616e]">When referred users complete onboarding, your reward points increase.</p>
                </div>
                <div className="rounded-sm bg-[#fafbfd] p-5 border border-[#e2e8f0]">
                  <p className="text-[15px] font-bold text-[#0a0b0d]">Unlock benefits</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#5b616e]">Use points for better visibility and promotional boosts inside the app.</p>
                </div>
              </div>
            </section>

            <section className="rounded-sm border border-[#e2e8f0] bg-white p-8 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5b616e]">Your referral code</p>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="rounded-sm border border-[#0052ff]/25 bg-[#0052ff]/5 px-6 py-3 text-[16px] font-bold tracking-[0.08em] text-[#0052ff]">
                  {referralProfile.referralCode}
                </div>
                <button
                  type="button"
                  onClick={copyReferralCode}
                  className="rounded-sm bg-[#0052ff] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#0046d8]"
                >
                  Copy code
                </button>
              </div>
              {referralProfile.referredBy && (
                <p className="mt-4 text-sm text-[#5b616e]">
                  You joined with referral code: <span className="font-bold text-[#0a0b0d]">{referralProfile.referredBy}</span>
                </p>
              )}
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <RewardMetric label="Reward points" value={referralProfile.rewardPoints} tone="primary" />
              <RewardMetric label="Successful referrals" value={referralProfile.totalReferrals} />
              <RewardMetric label="Current tier" value={rewardTier} />
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <article className="rounded-sm border border-[#e2e8f0] bg-white p-8 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5b616e]">Wallet</p>
                <p className="mt-3 text-[32px] font-bold text-[#0a0b0d]">Rs {referralData.wallet}</p>
                <p className="mt-2 text-[15px] text-[#5b616e]">Wallet balance can be used for future boosts and reward redemptions.</p>
              </article>

              <article className="rounded-sm border border-[#e2e8f0] bg-white p-8 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5b616e]">Redeem coupon</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Enter coupon code"
                    className="flex-1 rounded-sm border border-[#e2e8f0] bg-[#fafbfd] px-4 py-3 text-[15px] outline-none transition-colors focus:border-[#0052ff] focus:bg-white"
                  />
                  <button type="button" onClick={handleRedeemCoupon} className="rounded-sm bg-[#0a0b0d] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-black">Redeem</button>
                </div>
                {statusMessage && <p className="mt-4 text-[14px] font-bold text-[#0052ff]">{statusMessage}</p>}
              </article>
            </section>

            <section className="rounded-sm border border-[#e2e8f0] bg-white p-8 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#5b616e]">Milestone claims</p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <button type="button" onClick={() => handleMilestoneClaim(1, 5)} className="rounded-sm border border-[#e2e8f0] bg-[#fafbfd] p-5 text-left transition-colors hover:border-[#0052ff] hover:bg-[#0052ff]/5">
                  <p className="text-[15px] font-bold text-[#0a0b0d]">Tier 1</p>
                  <p className="mt-2 text-[14px] text-[#5b616e]">Claim after 5 referrals</p>
                </button>
                <button type="button" onClick={() => handleMilestoneClaim(2, 10)} className="rounded-sm border border-[#e2e8f0] bg-[#fafbfd] p-5 text-left transition-colors hover:border-[#0052ff] hover:bg-[#0052ff]/5">
                  <p className="text-[15px] font-bold text-[#0a0b0d]">Tier 2</p>
                  <p className="mt-2 text-[14px] text-[#5b616e]">Claim after 10 referrals</p>
                </button>
                <button type="button" onClick={() => handleMilestoneClaim(3, 25)} className="rounded-sm border border-[#e2e8f0] bg-[#fafbfd] p-5 text-left transition-colors hover:border-[#0052ff] hover:bg-[#0052ff]/5">
                  <p className="text-[15px] font-bold text-[#0a0b0d]">Tier 3</p>
                  <p className="mt-2 text-[14px] text-[#5b616e]">Claim after 25 referrals</p>
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
