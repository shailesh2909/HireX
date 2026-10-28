import React, { useMemo, useState } from 'react';
import {
  calculatePromotionAmount,
  clearSponsoredPosts,
  getSponsoredPosts,
  updateSponsoredPost,
  deleteSponsoredPost,
} from '../utils/promotionState';
import { getReferralData } from '../utils/appData';
import DashboardNavbar from '../components/DashboardNavbar';
import MockPaymentModal from '../components/MockPaymentModal';
import { Trash2 } from 'lucide-react';

function MockQr({ payload }) {
  const pattern = useMemo(() => {
    const seed = payload.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Array.from({ length: 121 }).map((_, index) => ((index * 13 + seed) % 7 < 3));
  }, [payload]);

  return (
    <div className="mt-3 inline-block border border-[rgba(91,97,110,0.25)] bg-white p-3">
      <div className="grid grid-cols-11 gap-[2px]">
        {pattern.map((active, index) => (
          <span key={`${payload}-${index}`} className={`h-2.5 w-2.5 ${active ? 'bg-[#0a0b0d]' : 'bg-white'}`} />
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5b616e]">Mock QR</p>
    </div>
  );
}

function PromotionCard({ promotion, onRefresh }) {
  const [desiredReach, setDesiredReach] = useState(promotion.desiredReach || 5000);
  const [showQr, setShowQr] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const amountDue = calculatePromotionAmount(desiredReach);
  const qrPayload = `SYNCUP|PROMO:${promotion.id}|REACH:${desiredReach}|PAY:${amountDue}`;

  function handleGenerateQr() {
    const updated = updateSponsoredPost(promotion.id, {
      desiredReach,
      amountDue,
      paymentStatus: 'unpaid',
      status: 'payment_pending',
    });

    if (updated) {
      onRefresh();
    }

    setShowQr(true);
  }

  function handleMockPaymentSuccess() {
    const updated = updateSponsoredPost(promotion.id, {
      desiredReach,
      amountDue,
      paidAmount: amountDue,
      paymentStatus: 'paid',
      status: 'active',
      impressions: Math.max(promotion.impressions || 0, desiredReach),
    });

    if (updated) {
      onRefresh();
    }

    setShowQr(false);
    setShowPayment(false);
  }

  function handleDelete() {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      deleteSponsoredPost(promotion.id);
      onRefresh();
    }
  }

  return (
    <article className="rounded-sm border border-[rgba(91,97,110,0.18)] bg-white p-5 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#0a0b0d]">Sponsored Post</p>
          <p className="text-xs text-[#5b616e]">Audience: {promotion.audience}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-sm px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${promotion.status === 'active' ? 'bg-[#0052ff]/10 text-[#0052ff]' : 'bg-[#eef0f3] text-[#5b616e]'}`}>
            {promotion.status === 'active' ? 'Active' : 'Payment pending'}
          </span>
          <button
            onClick={handleDelete}
            className="rounded-sm p-1.5 text-[#5b616e] transition-colors hover:bg-red-50 hover:text-red-600"
            title="Delete campaign"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm leading-[1.6] text-[#0a0b0d]">{promotion.content}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-sm bg-[#f5f7fb] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Budget</p>
          <p className="mt-1 text-sm font-semibold text-[#0a0b0d]">Rs {promotion.budget}</p>
        </div>
        <div className="rounded-sm bg-[#f5f7fb] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Impressions</p>
          <p className="mt-1 text-sm font-semibold text-[#0a0b0d]">{promotion.impressions}</p>
        </div>
        <div className="rounded-sm bg-[#f5f7fb] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Clicks</p>
          <p className="mt-1 text-sm font-semibold text-[#0a0b0d]">{promotion.clicks}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-sm bg-[#f5f7fb] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Target type</p>
          <p className="mt-1 text-sm font-semibold text-[#0a0b0d]">{promotion.targetType || 'post'}</p>
        </div>
        <div className="rounded-sm bg-[#f5f7fb] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Schedule</p>
          <p className="mt-1 text-sm font-semibold text-[#0a0b0d]">{promotion.startDate || 'Start'} to {promotion.endDate || 'End'}</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-[#5b616e]">
        Media attached: <span className="font-semibold text-[#0a0b0d]">{promotion.imageCount}</span>
      </p>

      <div className="mt-4 rounded-sm border border-[rgba(91,97,110,0.18)] bg-[#f8f9fc] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Pay as per reach</p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`reach-${promotion.id}`} className="text-xs font-semibold text-[#5b616e]">Desired reach</label>
            <input
              id={`reach-${promotion.id}`}
              type="number"
              min="1000"
              step="1000"
              value={desiredReach}
              onChange={(e) => setDesiredReach(Math.max(1000, Number(e.target.value) || 1000))}
              className="mt-1 w-full rounded-sm border border-[rgba(91,97,110,0.25)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0052ff]"
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#5b616e]">Amount to pay</p>
            <p className="mt-2 text-xl font-semibold text-[#0a0b0d]">Rs {amountDue}</p>
            <p className="text-xs text-[#5b616e]">Rate: Rs 75 per 1000 reach</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleGenerateQr}
            className="rounded-sm border border-[#0052ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#0052ff] transition-colors hover:bg-[#0052ff] hover:text-white"
          >
            Generate mock QR
          </button>
          <button
            type="button"
            onClick={() => setShowPayment(true)}
            className="rounded-sm bg-[#0052ff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#0046d8]"
          >
            Pay with Card (Mock)
          </button>
        </div>

        {showQr && <MockQr payload={qrPayload} />}

        {showPayment && (
          <MockPaymentModal
            event={{ title: `Ad: ${promotion.audience}`, ticketPrice: amountDue }}
            currency="Rs "
            itemLabel={`${desiredReach} Reach`}
            onClose={() => setShowPayment(false)}
            onSuccess={handleMockPaymentSuccess}
          />
        )}

        <p className="mt-3 text-xs text-[#5b616e]">
          Payment status: <span className="font-semibold text-[#0a0b0d]">{promotion.paymentStatus || 'unpaid'}</span>
        </p>
      </div>
    </article>
  );
}

export default function SmartPromotion() {
  const [refreshKey, setRefreshKey] = useState(0);
  const promotions = useMemo(() => getSponsoredPosts(), [refreshKey]);
  const referralData = useMemo(() => getReferralData(), [refreshKey]);

  function refreshPromotions() {
    setRefreshKey((value) => value + 1);
  }

  function clearAllPromotions() {
    clearSponsoredPosts();
    refreshPromotions();
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#eaf0ff_0%,#f5f7fb_45%,#f5f7fb_100%)] px-6 py-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1180px] space-y-6">
        <DashboardNavbar activePath="/smart-promotion" />

        <header className="rounded-sm border border-[rgba(91,97,110,0.18)] bg-white px-6 py-5 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b616e]">Smart Promotion</p>
          <h1 className="mt-2 text-[36px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0a0b0d]">Promote your posts as sponsored ads</h1>
          <p className="mt-3 max-w-[760px] text-[16px] leading-[1.6] text-[#5b616e]">Track your sponsored campaigns and ad performance from this dashboard.</p>
        </header>

        <section className="rounded-sm border border-[rgba(91,97,110,0.18)] bg-white p-5 shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#5b616e]">
              Active sponsored posts: <span className="font-semibold text-[#0a0b0d]">{promotions.length}</span>
            </p>
            <p className="text-sm text-[#5b616e]">
              Wallet balance: <span className="font-semibold text-[#0a0b0d]">Rs {referralData.wallet}</span>
            </p>
            {promotions.length > 0 && (
              <button
                type="button"
                onClick={clearAllPromotions}
                className="rounded-sm border border-[rgba(91,97,110,0.25)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#0a0b0d] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]"
              >
                Clear campaigns
              </button>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {promotions.map((promotion) => (
            <PromotionCard key={promotion.id} promotion={promotion} onRefresh={refreshPromotions} />
          ))}

          {promotions.length === 0 && (
            <div className="md:col-span-2 rounded-sm border border-[rgba(91,97,110,0.18)] bg-white p-6 text-center shadow-[0_8px_24px_rgba(10,11,13,0.05)]">
              <p className="text-lg font-semibold text-[#0a0b0d]">No sponsored posts yet</p>
              <p className="mt-2 text-sm text-[#5b616e]">Create a post and enable smart promotion to launch your first campaign.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
