const PROMOTION_STORAGE_KEY = 'syncup.promotions';

function readPromotions() {
  try {
    const raw = localStorage.getItem(PROMOTION_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePromotions(promotions) {
  localStorage.setItem(PROMOTION_STORAGE_KEY, JSON.stringify(promotions));
}

export function getSponsoredPosts() {
  return readPromotions();
}

export function calculatePromotionAmount(desiredReach = 5000) {
  const safeReach = Math.max(1000, Number(desiredReach) || 1000);
  const slabs = Math.ceil(safeReach / 1000);
  return slabs * 75;
}

export function addSponsoredPost({
  content,
  imageCount = 0,
  audience = 'All professionals',
  budget = 500,
  targetType = 'post',
  targetId = `post-${Date.now()}`,
  startDate = new Date().toISOString().slice(0, 10),
  endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
}) {
  const promotions = readPromotions();
  const desiredReach = Math.max(1000, Math.round((Number(budget) || 500) * 10));
  const amountDue = calculatePromotionAmount(desiredReach);

  const nextPromotion = {
    id: `promo-${Date.now()}`,
    content,
    imageCount,
    audience,
    budget,
    targetType,
    targetId,
    startDate,
    endDate,
    desiredReach,
    amountDue,
    paidAmount: 0,
    paymentStatus: 'unpaid',
    impressions: 0,
    clicks: Math.floor(Math.random() * 140) + 10,
    status: 'payment_pending',
    createdAt: new Date().toISOString(),
  };

  const next = [nextPromotion, ...promotions];
  writePromotions(next);
  return nextPromotion;
}

export function clearSponsoredPosts() {
  writePromotions([]);
}

export function deleteSponsoredPost(promotionId) {
  const promotions = readPromotions();
  const next = promotions.filter((promotion) => promotion.id !== promotionId);
  writePromotions(next);
}

export function updateSponsoredPost(promotionId, patch) {
  const promotions = readPromotions();
  const next = promotions.map((promotion) => (
    promotion.id === promotionId
      ? { ...promotion, ...patch }
      : promotion
  ));
  writePromotions(next);
  return next.find((promotion) => promotion.id === promotionId);
}
