import axios from 'axios';
import { getToken } from '../utils/flowState';

/**
 * Dedicated Axios instance for the Company Verification micro-service (port 3002).
 * In development, Vite proxies /api/companies → http://127.0.0.1:3002.
 */
const companyApi = axios.create({
  baseURL: '/api/companies',
  timeout: 120000, // 120s — CPU-based OCR on multi-page PDFs can be slow
});

// Attach auth token to every request
companyApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Step 1 & 2 — Registry look-up + Domain verification.
 * POST /api/companies/verify
 * 
 * This is the ENTRY POINT. It returns a `sessionId` that MUST be passed
 * to all subsequent steps. The backend rejects any step that doesn't
 * carry a valid sessionId with the correct stage gate.
 * 
 * @returns {{ sessionId: string, verified_legal_name: string, registry_status: string, ... }}
 */
export async function verifyRegistryAndDomain({ companyNumber, claimedDomain, userId }) {
  const { data } = await companyApi.post('/verify', {
    companyNumber,
    claimedDomain,
    userId,
  });
  return data;
}

/**
 * Step 3 — Cryptographic Document Forensics (AI-powered OCR / embedding check).
 * POST /api/companies/document-check
 * Sends the incorporation PDF as multipart/form-data.
 * 
 * REQUIRES: sessionId from Step 1 (backend verifies Stage 1 passed)
 * NOTE: Do NOT set Content-Type header manually — let the browser set the
 *       multipart boundary automatically to prevent boundary mismatch errors.
 */
export async function checkDocument({ file, sessionId }) {
  const formData = new FormData();
  // IMPORTANT: For Fastify streaming multipart, scalar fields must be appended BEFORE files
  formData.append('sessionId', sessionId);
  formData.append('document', file);

  const { data } = await companyApi.post('/document-check', formData);
  return data;
}

/**
 * Step 4 — Director Identity Triangulation.
 * POST /api/companies/verify-director
 * 
 * REQUIRES: sessionId from Step 1 (backend verifies Stages 1-3 passed)
 * This is the ONLY step that writes "VERIFIED" to the Prisma database.
 */
export async function verifyDirector({ companyNumber, userLegalName, sessionId }) {
  const { data } = await companyApi.post('/verify-director', {
    companyNumber,
    userLegalName,
    sessionId,
  });
  return data;
}
