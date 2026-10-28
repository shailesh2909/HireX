const API_BASE = '/api/events';

function getAuthHeaders(user) {
  return {
    'Content-Type': 'application/json',
    'x-user-id': user.id,
    'x-is-verified': String(user.isVerified),
  };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function createEvent(user, { title, ticketPrice, eventDate, posterUrl }) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: getAuthHeaders(user),
    body: JSON.stringify({ title, ticketPrice, eventDate, posterUrl }),
  });
  return handleResponse(res);
}

export async function buyTicket(user, eventId) {
  const res = await fetch(`${API_BASE}/${eventId}/buy`, {
    method: 'POST',
    headers: getAuthHeaders(user),
    body: JSON.stringify({}),
  });
  return handleResponse(res);
}

export async function scanTicket(user, eventId, checkInHash) {
  const res = await fetch(`${API_BASE}/${eventId}/scan`, {
    method: 'POST',
    headers: getAuthHeaders(user),
    body: JSON.stringify({ checkInHash }),
  });
  return handleResponse(res);
}

export async function cancelEvent(user, eventId) {
  const res = await fetch(`${API_BASE}/${eventId}/cancel`, {
    method: 'POST',
    headers: getAuthHeaders(user),
    body: JSON.stringify({}),
  });
  return handleResponse(res);
}

export async function settleEvent(user, eventId) {
  const res = await fetch(`${API_BASE}/${eventId}/settle`, {
    method: 'POST',
    headers: getAuthHeaders(user),
    body: JSON.stringify({}),
  });
  return handleResponse(res);
}
