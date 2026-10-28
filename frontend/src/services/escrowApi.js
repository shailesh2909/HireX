const BASE = '/api/events';

async function request(url, userId, isVerified, body = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      'x-is-verified': String(isVerified),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || data.message || 'Transaction failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const escrowApi = {
  buyTicket(eventId, userId, isVerified) {
    return request(`${BASE}/${eventId}/buy`, userId, isVerified);
  },

  cancelAndRefund(eventId, userId) {
    return request(`${BASE}/${eventId}/cancel`, userId, false);
  },

  settleEscrow(eventId, userId) {
    return request(`${BASE}/${eventId}/settle`, userId, false);
  },
};
