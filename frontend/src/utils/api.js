import { getToken } from './flowState';

const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function registerUser({ name, email, password, role, companyName, diditVerificationToken }) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role, companyName, diditVerificationToken }),
  });
}

export async function createDiditPreSession() {
  return request('/api/auth/didit-pre-session', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function syncDiditPreSession({ stateId, sessionId }) {
  return request('/api/auth/didit-pre-sync', {
    method: 'POST',
    body: JSON.stringify({ state_id: stateId, session_id: sessionId }),
  });
}

export async function loginUser({ email, password }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getCurrentUser() {
  return request('/api/auth/me');
}

export async function verifyIdentity(formData) {
  return request('/api/verify/sessions/run', {
    method: 'POST',
    body: formData,
  });
}

export async function validateGovernmentId(formData) {
  return request('/api/verify/extract-id', {
    method: 'POST',
    body: formData,
  });
}

export async function getPosts() {
  return request('/api/posts');
}

export async function createPost(postData) {
  return request('/api/posts', {
    method: 'POST',
    body: JSON.stringify(postData),
  });
}

export async function likePost(postId) {
  return request(`/api/posts/${postId}/like`, {
    method: 'POST',
  });
}

export async function commentPost(postId, text) {
  return request(`/api/posts/${postId}/comment`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

// --- COMMUNITY (Jobs & Network) ---

export async function getJobs() {
  return request('/api/community/jobs');
}

export async function createJob(jobData) {
  return request('/api/community/jobs', {
    method: 'POST',
    body: JSON.stringify(jobData),
  });
}

export async function getDiscoverList() {
  return request('/api/community/network/discover');
}

export async function getMyConnections() {
  return request('/api/community/network/my');
}

export async function connectToUser(targetId) {
  return request('/api/community/network/connect', {
    method: 'POST',
    body: JSON.stringify({ targetId }),
  });
}

export async function getEvents() {
  return request('/api/community/events');
}

export async function createEvent(eventData) {
  return request('/api/community/events', {
    method: 'POST',
    body: JSON.stringify(eventData),
  });
}

export async function buyTicket(eventId) {
  return request(`/api/community/events/${eventId}/buy`, {
    method: 'POST',
  });
}

export async function deleteEvent(eventId) {
  return request(`/api/community/events/${eventId}`, {
    method: 'DELETE',
  });
}

