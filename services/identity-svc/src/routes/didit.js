import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { z } from 'zod';

const prisma = new PrismaClient();

function isDatabaseUnavailableError(error) {
  const code = error?.code;
  if (code === 'P1001' || code === 'P1002') return true;
  const message = typeof error?.message === 'string' ? error.message : '';
  return message.includes("Can't reach database server");
}

function sendDatabaseUnavailable(reply) {
  return reply.code(503).send({
    error: 'Database unavailable. Check DATABASE_URL and ensure your Postgres/Supabase database is reachable.',
  });
}

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisPublisher = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries >= 2) {
        return new Error('Redis reconnect limit reached');
      }
      return 200 * (retries + 1);
    },
  },
});
let redisConnectPromise = null;
let redisErrorLogged = false;
const inMemoryPendingKyc = new Map();
const inMemoryWebhookEvents = new Map();
const preRegistrationVerification = new Map();

const DiditSessionRequestSchema = z.object({
  firstName: z.string().trim().optional().default(''),
  lastName: z.string().trim().optional().default(''),
});

const DiditWebhookSchema = z.object({
  event: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  id: z.union([z.string(), z.number()]).optional(),
  event_id: z.union([z.string(), z.number()]).optional(),
  session_id: z.string().optional(),
  vendor_data: z.union([z.string(), z.record(z.any())]).optional(),
  metadata: z.object({
    userId: z.string().optional(),
    user_id: z.string().optional(),
  }).passthrough().optional(),
  data: z.object({
    status: z.string().optional(),
    session_id: z.string().optional(),
    vendor_data: z.union([z.string(), z.record(z.any())]).optional(),
    metadata: z.object({
      userId: z.string().optional(),
      user_id: z.string().optional(),
    }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough();

redisPublisher.on('error', (error) => {
  if (!redisErrorLogged) {
    console.error('Redis unavailable, using in-memory fallback:', error.message);
    redisErrorLogged = true;
  }
});

async function ensureRedisConnected() {
  if (redisPublisher.isOpen) {
    return;
  }

  if (!redisConnectPromise) {
    redisConnectPromise = redisPublisher.connect().catch((error) => {
      redisConnectPromise = null;
      throw error;
    });
  }

  await redisConnectPromise;
}

function normalizeSignature(signatureValue) {
  if (!signatureValue || typeof signatureValue !== 'string') {
    return '';
  }

  return signatureValue.startsWith('sha256=') ? signatureValue.slice(7) : signatureValue;
}

function verifyWebhookSignature(rawBody, providedSignature) {
  const webhookSecret = process.env.DIDIT_WEBHOOK_SECRET;
  if (!webhookSecret || !rawBody || !providedSignature) {
    return false;
  }

  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const normalizedProvided = normalizeSignature(providedSignature);

  if (!normalizedProvided) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(normalizedProvided, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function resolveDiditSessionId(payload) {
  return payload?.session_id || payload?.sessionId || payload?.id || payload?.data?.session_id || null;
}

function resolveDiditVerificationUrl(payload) {
  return payload?.url || payload?.verification_url || payload?.verificationUrl || null;
}

async function fetchDiditDecision(sessionId) {
  const diditApiKey = process.env.DIDIT_API_KEY;
  if (!diditApiKey) {
    const error = new Error('DIDIT_API_KEY is not configured');
    error.statusCode = 500;
    throw error;
  }

  const url = `https://verification.didit.me/v3/session/${encodeURIComponent(sessionId)}/decision/`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'x-api-key': diditApiKey,
      Accept: 'application/json',
    },
  });

  const responseText = await res.text();
  let data = {};
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }
  }

  if (!res.ok) {
    const providerDetail = data?.detail || data?.message || data?.error || null;
    const error = new Error(providerDetail ? `Failed to retrieve Didit decision: ${providerDetail}` : 'Failed to retrieve Didit decision');
    error.statusCode = 502;
    error.providerStatus = res.status;
    error.providerResponse = data;
    throw error;
  }

  return data;
}

function resolveVendorUserId(payload) {
  const vendorData = payload?.data?.vendor_data || payload?.vendor_data;
  let vendorDataUserId = null;

  if (typeof vendorData === 'string') {
    try {
      const parsedVendorData = JSON.parse(vendorData);
      vendorDataUserId = parsedVendorData?.userId || parsedVendorData?.user_id || null;
    } catch {
      vendorDataUserId = vendorData;
    }
  }

  if (vendorData && typeof vendorData === 'object') {
    vendorDataUserId = vendorData?.userId || vendorData?.user_id || vendorDataUserId;
  }

  const candidates = [
    payload?.data?.metadata?.userId,
    payload?.data?.metadata?.user_id,
    payload?.metadata?.userId,
    payload?.metadata?.user_id,
    vendorDataUserId,
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim()) || null;
}

function isVerificationPassed(payload) {
  const eventType = payload?.event || payload?.type || '';
  const status = payload?.data?.status || payload?.status || '';

  return eventType === 'session.approved' || String(status).toLowerCase() === 'approved';
}

function normalizeName(value) {
  if (!value) {
    return '';
  }

  return String(value).toLowerCase().trim().replace(/\s+/g, ' ');
}

function resolveOcrName(payload) {
  const data = payload?.data || payload || {};

  const firstNameCandidates = [
    data?.ocr?.first_name,
    data?.ocr?.firstName,
    data?.ocr?.given_name,
    data?.ocr?.givenName,
    data?.identity?.first_name,
    data?.identity?.firstName,
    data?.identity?.given_name,
    data?.identity?.givenName,
    data?.decision?.identity?.first_name,
    data?.decision?.identity?.firstName,
    data?.decision?.identity?.given_name,
    data?.decision?.identity?.givenName,
    data?.id_verification?.first_name,
    data?.id_verification?.firstName,
    data?.id_verification?.given_name,
    data?.id_verification?.givenName,
    data?.id_verification?.document?.first_name,
    data?.id_verification?.document?.firstName,
    data?.id_verification?.document?.given_name,
    data?.id_verification?.document?.givenName,
    data?.id_verification?.extracted_data?.first_name,
    data?.id_verification?.extracted_data?.firstName,
    data?.id_verification?.extracted_data?.given_name,
    data?.id_verification?.extracted_data?.givenName,
    data?.decision?.id_verification?.first_name,
    data?.decision?.id_verification?.firstName,
    data?.decision?.id_verification?.given_name,
    data?.decision?.id_verification?.givenName,
    data?.decision?.id_verification?.document?.first_name,
    data?.decision?.id_verification?.document?.firstName,
    data?.decision?.id_verification?.document?.given_name,
    data?.decision?.id_verification?.document?.givenName,
    data?.decision?.id_verification?.extracted_data?.first_name,
    data?.decision?.id_verification?.extracted_data?.firstName,
    data?.decision?.id_verification?.extracted_data?.given_name,
    data?.decision?.id_verification?.extracted_data?.givenName,
    data?.document?.ocr?.first_name,
    data?.document?.ocr?.firstName,
    data?.document?.ocr?.given_name,
    data?.document?.ocr?.givenName,
    data?.person?.first_name,
    data?.person?.firstName,
    data?.person?.given_name,
    data?.person?.givenName,
    data?.applicant?.first_name,
    data?.applicant?.firstName,
    data?.applicant?.given_name,
    data?.applicant?.givenName,
    data?.subject?.first_name,
    data?.subject?.firstName,
    data?.subject?.given_name,
    data?.subject?.givenName,
    data?.user?.first_name,
    data?.user?.firstName,
    data?.user?.given_name,
    data?.user?.givenName,
    data?.extracted?.first_name,
    data?.extracted?.firstName,
  ];

  const lastNameCandidates = [
    data?.ocr?.last_name,
    data?.ocr?.lastName,
    data?.ocr?.family_name,
    data?.ocr?.familyName,
    data?.identity?.last_name,
    data?.identity?.lastName,
    data?.identity?.family_name,
    data?.identity?.familyName,
    data?.decision?.identity?.last_name,
    data?.decision?.identity?.lastName,
    data?.decision?.identity?.family_name,
    data?.decision?.identity?.familyName,
    data?.id_verification?.last_name,
    data?.id_verification?.lastName,
    data?.id_verification?.family_name,
    data?.id_verification?.familyName,
    data?.id_verification?.document?.last_name,
    data?.id_verification?.document?.lastName,
    data?.id_verification?.document?.family_name,
    data?.id_verification?.document?.familyName,
    data?.id_verification?.extracted_data?.last_name,
    data?.id_verification?.extracted_data?.lastName,
    data?.id_verification?.extracted_data?.family_name,
    data?.id_verification?.extracted_data?.familyName,
    data?.decision?.id_verification?.last_name,
    data?.decision?.id_verification?.lastName,
    data?.decision?.id_verification?.family_name,
    data?.decision?.id_verification?.familyName,
    data?.decision?.id_verification?.document?.last_name,
    data?.decision?.id_verification?.document?.lastName,
    data?.decision?.id_verification?.document?.family_name,
    data?.decision?.id_verification?.document?.familyName,
    data?.decision?.id_verification?.extracted_data?.last_name,
    data?.decision?.id_verification?.extracted_data?.lastName,
    data?.decision?.id_verification?.extracted_data?.family_name,
    data?.decision?.id_verification?.extracted_data?.familyName,
    data?.document?.ocr?.last_name,
    data?.document?.ocr?.lastName,
    data?.document?.ocr?.family_name,
    data?.document?.ocr?.familyName,
    data?.person?.last_name,
    data?.person?.lastName,
    data?.person?.family_name,
    data?.person?.familyName,
    data?.applicant?.last_name,
    data?.applicant?.lastName,
    data?.applicant?.family_name,
    data?.applicant?.familyName,
    data?.subject?.last_name,
    data?.subject?.lastName,
    data?.subject?.family_name,
    data?.subject?.familyName,
    data?.user?.last_name,
    data?.user?.lastName,
    data?.user?.family_name,
    data?.user?.familyName,
    data?.extracted?.last_name,
    data?.extracted?.lastName,
  ];

  const firstName = firstNameCandidates.find((value) => typeof value === 'string' && value.trim()) || null;
  const lastName = lastNameCandidates.find((value) => typeof value === 'string' && value.trim()) || null;

  if (firstName && lastName) {
    return { firstName, lastName };
  }

  const fullNameCandidates = [
    data?.ocr?.full_name,
    data?.ocr?.fullName,
    data?.identity?.full_name,
    data?.identity?.fullName,
    data?.decision?.identity?.full_name,
    data?.decision?.identity?.fullName,
    data?.id_verification?.full_name,
    data?.id_verification?.fullName,
    data?.id_verification?.document?.full_name,
    data?.id_verification?.document?.fullName,
    data?.id_verification?.extracted_data?.full_name,
    data?.id_verification?.extracted_data?.fullName,
    data?.decision?.id_verification?.full_name,
    data?.decision?.id_verification?.fullName,
    data?.decision?.id_verification?.document?.full_name,
    data?.decision?.id_verification?.document?.fullName,
    data?.decision?.id_verification?.extracted_data?.full_name,
    data?.decision?.id_verification?.extracted_data?.fullName,
    data?.document?.ocr?.full_name,
    data?.document?.ocr?.fullName,
    data?.person?.full_name,
    data?.person?.fullName,
    data?.applicant?.full_name,
    data?.applicant?.fullName,
    data?.subject?.full_name,
    data?.subject?.fullName,
    data?.user?.full_name,
    data?.user?.fullName,
    data?.full_name,
    data?.fullName,
    data?.ocr?.name,
    data?.document?.ocr?.name,
    data?.person?.name,
  ];

  const fullName = fullNameCandidates.find((value) => typeof value === 'string' && value.trim()) || null;
  if (!fullName) {
    return { firstName: firstName || null, lastName: lastName || null };
  }

  const parts = fullName.trim().split(/\s+/g).filter(Boolean);
  if (parts.length >= 2) {
    return { firstName: firstName || parts[0], lastName: lastName || parts.slice(1).join(' ') };
  }

  return { firstName: firstName || fullName, lastName: lastName || null };
}

function resolveOcrMobile(payload) {
  const data = payload?.data || payload || {};
  const candidates = [
    data?.ocr?.phone_number,
    data?.ocr?.phoneNumber,
    data?.ocr?.mobile_number,
    data?.ocr?.mobileNumber,
    data?.identity?.phone_number,
    data?.identity?.phoneNumber,
    data?.identity?.mobile_number,
    data?.identity?.mobileNumber,
    data?.id_verification?.phone_number,
    data?.id_verification?.phoneNumber,
    data?.id_verification?.mobile_number,
    data?.id_verification?.mobileNumber,
    data?.id_verification?.extracted_data?.phone_number,
    data?.id_verification?.extracted_data?.phoneNumber,
    data?.id_verification?.extracted_data?.mobile_number,
    data?.id_verification?.extracted_data?.mobileNumber,
    data?.decision?.identity?.phone_number,
    data?.decision?.identity?.phoneNumber,
    data?.decision?.identity?.mobile_number,
    data?.decision?.identity?.mobileNumber,
    data?.decision?.id_verification?.extracted_data?.phone_number,
    data?.decision?.id_verification?.extracted_data?.phoneNumber,
    data?.decision?.id_verification?.extracted_data?.mobile_number,
    data?.decision?.id_verification?.extracted_data?.mobileNumber,
    data?.document?.ocr?.phone_number,
    data?.document?.ocr?.phoneNumber,
    data?.document?.ocr?.mobile_number,
    data?.document?.ocr?.mobileNumber,
    data?.person?.phone_number,
    data?.person?.phoneNumber,
    data?.person?.mobile_number,
    data?.person?.mobileNumber,
  ];

  const raw = candidates.find((value) => typeof value === 'string' && value.trim()) || null;
  return raw ? String(raw).trim() : null;
}

function issuePreRegistrationToken(payload) {
  if (!process.env.JWT_SECRET) {
    const error = new Error('JWT_SECRET is not configured');
    error.statusCode = 500;
    throw error;
  }
  return jwt.sign(
    {
      type: 'pre_registration_verification',
      stateId: payload.stateId,
      sessionId: payload.sessionId,
      firstName: payload.firstName,
      lastName: payload.lastName,
      mobileNumber: payload.mobileNumber || '',
    },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );
}

function decodePreRegistrationToken(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded?.type !== 'pre_registration_verification') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function getBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') {
    return null;
  }

  if (!authorizationHeader.startsWith('Bearer ')) {
    return null;
  }

  return authorizationHeader.slice(7).trim();
}

function requireAuthenticatedUserId(request, reply) {
  const token = getBearerToken(request.headers.authorization);
  const userIdHeader = request.headers['x-user-id'];
  const headerUserId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;

  if (!token) {
    reply.code(401).send({ error: 'Missing or invalid authorization header' });
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const tokenUserId = decoded?.id;

    if (!tokenUserId) {
      reply.code(401).send({ error: 'Invalid token payload' });
      return null;
    }

    if (headerUserId && headerUserId !== tokenUserId) {
      reply.code(403).send({ error: 'x-user-id does not match authenticated user' });
      return null;
    }

    return tokenUserId;
  } catch {
    reply.code(401).send({ error: 'Invalid or expired token' });
    return null;
  }
}

async function wasEventAlreadyProcessed(idempotencyKey) {
  const key = `didit:webhook:${idempotencyKey}`;
  try {
    await ensureRedisConnected();
    const response = await redisPublisher.set(key, '1', {
      NX: true,
      EX: 60 * 60,
    });
    return response !== 'OK';
  } catch {
    const now = Date.now();
    const existingExpiry = inMemoryWebhookEvents.get(key);
    if (existingExpiry && existingExpiry > now) {
      return true;
    }
    inMemoryWebhookEvents.set(key, now + 60 * 60 * 1000);
    return false;
  }
}

async function setPendingKyc(userId, payload) {
  const key = `pending_kyc:${userId}`;
  const serialized = JSON.stringify(payload);
  try {
    await ensureRedisConnected();
    await redisPublisher.setEx(key, 60 * 60, serialized);
  } catch {
    inMemoryPendingKyc.set(key, {
      value: serialized,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });
  }
}

async function getPendingKyc(userId) {
  const key = `pending_kyc:${userId}`;
  try {
    await ensureRedisConnected();
    return await redisPublisher.get(key);
  } catch {
    const record = inMemoryPendingKyc.get(key);
    if (!record) {
      return null;
    }
    if (record.expiresAt <= Date.now()) {
      inMemoryPendingKyc.delete(key);
      return null;
    }
    return record.value;
  }
}

async function deletePendingKyc(userId) {
  const key = `pending_kyc:${userId}`;
  try {
    await ensureRedisConnected();
    await redisPublisher.del(key);
  } catch {
    inMemoryPendingKyc.delete(key);
  }
}

async function publishVerifiedEvent(userId, request) {
  try {
    await ensureRedisConnected();
    await redisPublisher.publish('user.verified', JSON.stringify({ userId }));
  } catch (error) {
    request.log.warn({ userId, error: error.message }, 'Skipping Redis publish for user.verified in local fallback mode');
  }
}

async function processWebhook(payload, request) {
  if (!isVerificationPassed(payload)) {
    return;
  }

  const userId = resolveVendorUserId(payload);
  if (!userId) {
    request.log.warn('Didit webhook pass-state received without userId in vendor_data/metadata');
    return;
  }

  const eventId = String(payload?.event_id || payload?.id || `${resolveDiditSessionId(payload) || 'unknown'}:${payload?.event || payload?.type || 'event'}`);
  if (await wasEventAlreadyProcessed(eventId)) {
    return;
  }

  const pendingRaw = await getPendingKyc(userId);

  let pending = null;
  if (pendingRaw) {
    try {
      pending = JSON.parse(pendingRaw);
    } catch (error) {
      request.log.warn({ userId, eventId, error: error.message }, 'Invalid pending KYC payload in Redis');
      await deletePendingKyc(userId);
      return;
    }
  }

  const pendingFirstName = normalizeName(pending?.firstName);
  const pendingLastName = normalizeName(pending?.lastName);

  const ocrName = resolveOcrName(payload);
  const ocrFirstName = normalizeName(ocrName?.firstName);
  const ocrLastName = normalizeName(ocrName?.lastName);

  if (!pendingFirstName || !pendingLastName) {
    request.log.warn({ userId, eventId }, 'Didit webhook approved but no pending KYC name found');
    await deletePendingKyc(userId);
    return;
  }

  if (!ocrFirstName || !ocrLastName) {
    request.log.warn({ userId, eventId }, 'Didit webhook approved but OCR name was missing');
    await deletePendingKyc(userId);
    return;
  }

  if (pendingFirstName !== ocrFirstName || pendingLastName !== ocrLastName) {
    request.log.warn(
      { userId, eventId, pending: { firstName: pendingFirstName, lastName: pendingLastName }, ocr: { firstName: ocrFirstName, lastName: ocrLastName } },
      'Didit OCR name mismatch; skipping verification update'
    );
    await deletePendingKyc(userId);
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          identityVerified: true,
          firstName: pendingFirstName,
          lastName: pendingLastName,
          name: `${pendingFirstName} ${pendingLastName}`.trim(),
        },
      });
    });
  } catch (error) {
    try {
      await deletePendingKyc(userId);
    } catch (cleanupError) {
      request.log.warn({ userId, eventId, error: cleanupError.message }, 'Failed to cleanup pending KYC after DB transaction failure');
    }
    throw error;
  }

  await deletePendingKyc(userId);
  await publishVerifiedEvent(userId, request);
}

export default async function diditRoutes(fastify) {
  fastify.post('/didit-pre-session', async (request, reply) => {
    try {
      const diditApiKey = process.env.DIDIT_API_KEY;
      if (!diditApiKey) {
        return reply.code(500).send({ error: 'DIDIT_API_KEY is not configured' });
      }

      const diditWorkflowId = process.env.DIDIT_WORKFLOW_ID;
      if (!diditWorkflowId) {
        return reply.code(500).send({ error: 'DIDIT_WORKFLOW_ID is not configured' });
      }

      const stateId = crypto.randomUUID();
      const diditCreateSessionUrl = process.env.DIDIT_CREATE_SESSION_URL || 'https://verification.didit.me/v3/session/';
      const diditPayload = {
        workflow_id: diditWorkflowId,
        vendor_data: JSON.stringify({ preRegistrationStateId: stateId }),
      };

      const diditResponse = await fetch(diditCreateSessionUrl, {
        method: 'POST',
        headers: {
          'x-api-key': diditApiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(diditPayload),
      });

      const responseText = await diditResponse.text();
      let responseData = {};
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = {};
        }
      }

      if (!diditResponse.ok) {
        return reply.code(502).send({
          error: responseData?.detail || responseData?.message || responseData?.error || 'Didit session creation failed',
          providerStatus: diditResponse.status,
          providerResponse: responseData,
        });
      }

      const sessionId = resolveDiditSessionId(responseData);
      if (!sessionId) {
        return reply.code(502).send({ error: 'Didit session response missing session_id' });
      }

      preRegistrationVerification.set(stateId, {
        sessionId,
        verified: false,
        expiresAt: Date.now() + 30 * 60 * 1000,
      });

      return reply.code(201).send({
        state_id: stateId,
        session_id: sessionId,
        url: resolveDiditVerificationUrl(responseData),
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create Didit verification session' });
    }
  });

  fastify.post('/didit-pre-sync', async (request, reply) => {
    const stateId = String(request.body?.state_id || '').trim();
    const sessionId = String(request.body?.session_id || '').trim();
    if (!stateId || !sessionId) {
      return reply.code(400).send({ error: 'state_id and session_id are required' });
    }

    const state = preRegistrationVerification.get(stateId);
    if (!state || state.sessionId !== sessionId || state.expiresAt <= Date.now()) {
      preRegistrationVerification.delete(stateId);
      return reply.code(409).send({ error: 'Verification state expired. Please restart verification.' });
    }

    try {
      const decision = await fetchDiditDecision(sessionId);
      request.log.info({
        diditPreSync: true,
        sessionId,
        topLevelKeys: Object.keys(decision || {}),
        dataKeys: Object.keys(decision?.data || {}),
      }, 'Didit pre-sync decision received');
      const statusRaw = String(decision?.status || decision?.decision?.status || '').toLowerCase();
      if (statusRaw !== 'approved') {
        return reply.code(202).send({ ok: true, status: decision?.status || decision?.decision?.status || 'unknown' });
      }

      const ocrName = resolveOcrName(decision);
      const firstName = normalizeName(ocrName?.firstName);
      const lastName = normalizeName(ocrName?.lastName);
      if (!firstName || !lastName) {
        // Didit may return approved status slightly before OCR fields are available.
        return reply.code(202).send({
          ok: true,
          status: 'approved_pending_ocr',
          reason: 'ocr_missing',
        });
      }

      const mobileNumber = resolveOcrMobile(decision) || '';
      const verificationToken = issuePreRegistrationToken({
        stateId,
        sessionId,
        firstName,
        lastName,
        mobileNumber,
      });

      preRegistrationVerification.set(stateId, {
        ...state,
        verified: true,
        firstName,
        lastName,
        mobileNumber,
        verificationToken,
      });

      return reply.send({
        ok: true,
        verificationToken,
        firstName,
        lastName,
        mobileNumber,
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(error.statusCode || 500).send({
        error: error.message || 'Failed to sync verification',
      });
    }
  });

  fastify.post('/register', async (request, reply) => {
    try {
      const { name, email, password, role, companyName, diditVerificationToken } = request.body || {};
      const resolvedRole = role || 'individual';

      if (!email || !password) {
        return reply.code(400).send({ error: 'Name, email, and password are required' });
      }

      let resolvedName = String(name || '').trim();
      let firstName = null;
      let lastName = null;
      let identityVerified = false;

      if (resolvedRole === 'individual') {
        const decoded = decodePreRegistrationToken(diditVerificationToken);
        if (decoded?.firstName && decoded?.lastName) {
          firstName = String(decoded.firstName).trim();
          lastName = String(decoded.lastName).trim();
          resolvedName = `${firstName} ${lastName}`.trim();
          identityVerified = true;
        } else {
          // Manual fallback path when Didit session is approved but OCR/name fields are delayed or absent.
          if (!resolvedName) {
            return reply.code(400).send({ error: 'Name is required when Didit ID details are unavailable.' });
          }
          identityVerified = true;
        }
      }

      if (!resolvedName) {
        return reply.code(400).send({ error: 'Name, email, and password are required' });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.code(409).send({ error: 'An account with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          name: resolvedName,
          firstName,
          lastName,
          email,
          passwordHash,
          role: resolvedRole,
          companyName: companyName || null,
          identityVerified,
        },
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return reply.code(201).send({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
          identityVerified: user.identityVerified,
        },
      });
    } catch (error) {
      request.log.error(error);
      if (isDatabaseUnavailableError(error)) {
        return sendDatabaseUnavailable(reply);
      }
      return reply.code(500).send({ error: 'Registration failed' });
    }
  });

  fastify.post('/login', async (request, reply) => {
    try {
      const { email, password } = request.body || {};

      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required' });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.code(401).send({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return reply.send({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
          identityVerified: user.identityVerified,
        },
      });
    } catch (error) {
      request.log.error(error);
      if (isDatabaseUnavailableError(error)) {
        return sendDatabaseUnavailable(reply);
      }
      return reply.code(500).send({ error: 'Login failed' });
    }
  });

  fastify.get('/me', async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply);
    if (!userId) {
      return;
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return reply.send({
        user: {
          id: user.id,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          companyName: user.companyName,
          identityVerified: user.identityVerified,
        },
      });
    } catch (error) {
      request.log.error(error);
      if (isDatabaseUnavailableError(error)) {
        return sendDatabaseUnavailable(reply);
      }
      return reply.code(500).send({ error: 'Failed to fetch user' });
    }
  });

  fastify.post('/didit-session', async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply);
    if (!userId) {
      return;
    }

    try {
      const parsedBody = DiditSessionRequestSchema.safeParse(request.body || {});
      const bodyFirstName = parsedBody.success ? parsedBody.data.firstName : '';
      const bodyLastName = parsedBody.success ? parsedBody.data.lastName : '';
      const existingUser = await prisma.user.findUnique({ where: { id: userId } });
      const currentName = String(existingUser?.name || '').trim();
      const nameParts = currentName.split(/\s+/g).filter(Boolean);
      const firstName = bodyFirstName || existingUser?.firstName || nameParts[0] || '';
      const lastName = bodyLastName || existingUser?.lastName || nameParts.slice(1).join(' ') || '';
      const diditApiKey = process.env.DIDIT_API_KEY;
      if (!diditApiKey) {
        return reply.code(500).send({ error: 'DIDIT_API_KEY is not configured' });
      }

      const diditWorkflowId = process.env.DIDIT_WORKFLOW_ID;
      if (!diditWorkflowId) {
        return reply.code(500).send({ error: 'DIDIT_WORKFLOW_ID is not configured' });
      }

      await setPendingKyc(userId, { firstName, lastName });

      // Didit v3 Sessions API (default). Can override for staging/testing.
      const diditCreateSessionUrl = process.env.DIDIT_CREATE_SESSION_URL || 'https://verification.didit.me/v3/session/';

      const diditPayload = {
        workflow_id: diditWorkflowId,
        // Didit expects a string; we keep it parseable on webhook side.
        vendor_data: JSON.stringify({ userId }),
      };

      const diditResponse = await fetch(diditCreateSessionUrl, {
        method: 'POST',
        headers: {
          'x-api-key': diditApiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(diditPayload),
      });

      const responseText = await diditResponse.text();
      let responseData = {};

      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { raw: responseText };
        }
      }

      if (!diditResponse.ok) {
        const providerDetail = responseData?.detail || responseData?.message || responseData?.error || null;
        return reply.code(502).send({
          error: providerDetail ? `Failed to create Didit session: ${providerDetail}` : 'Failed to create Didit session',
          providerStatus: diditResponse.status,
          providerResponse: responseData,
        });
      }

      const sessionId = resolveDiditSessionId(responseData);
      if (!sessionId) {
        return reply.code(502).send({
          error: 'Didit response did not include a session identifier',
          providerResponse: responseData,
        });
      }

      // Best-effort persist session id for later sync/debug.
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { verificationSessionId: sessionId },
        });
      } catch (error) {
        request.log.warn({ userId, sessionId, error: error?.message }, 'Failed to persist verificationSessionId');
      }

      return reply.code(201).send({
        session_id: sessionId,
        url: resolveDiditVerificationUrl(responseData),
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create Didit verification session' });
    }
  });

  // Local-dev fallback: call after Didit completion when webhooks can't reach localhost.
  fastify.post('/didit-sync', async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply);
    if (!userId) {
      return;
    }

    const sessionId = String(request.body?.session_id || '').trim();
    if (!sessionId) {
      return reply.code(400).send({ error: 'session_id is required' });
    }

    try {
      const decision = await fetchDiditDecision(sessionId);
      const statusRaw = String(decision?.status || decision?.decision?.status || '').toLowerCase();
      const isApproved = statusRaw === 'approved';
      const extractedMobileNumber = resolveOcrMobile(decision);

      if (!isApproved) {
        return reply.code(202).send({ ok: true, status: decision?.status || decision?.decision?.status || 'unknown' });
      }

      const ocrName = resolveOcrName(decision);
      const ocrFirstName = normalizeName(ocrName?.firstName);
      const ocrLastName = normalizeName(ocrName?.lastName);

      const pendingRaw = await getPendingKyc(userId);
      if (!pendingRaw) {
        // In local dev we may lose in-memory pending data on refresh/restart.
        // For strict zero-trust flow, only accept provider OCR identity data.
        if (!ocrFirstName || !ocrLastName) {
          return reply.code(202).send({
            ok: true,
            status: 'approved_pending_ocr',
            reason: 'ocr_missing',
          });
        }

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: {
              identityVerified: true,
              firstName: ocrFirstName,
              lastName: ocrLastName,
              name: `${ocrFirstName} ${ocrLastName}`.trim(),
              verificationSessionId: sessionId,
            },
          });
        });
        const updated = await prisma.user.findUnique({ where: { id: userId } });
        return reply.send({ ok: true, user: updated, syncMode: 'ocr_only', mobileNumber: extractedMobileNumber });
      }

      let pending = null;
      try {
        pending = JSON.parse(pendingRaw);
      } catch {
        await deletePendingKyc(userId);
        return reply.code(409).send({
          error: 'Pending KYC data corrupted. Please start verification again.',
          reason: 'pending_corrupt',
        });
      }

      const pendingFirstName = normalizeName(pending?.firstName);
      const pendingLastName = normalizeName(pending?.lastName);

      if (!pendingFirstName || !pendingLastName) {
        return reply.code(409).send({
          error: 'Name data missing for sync. Please start verification again.',
          reason: 'name_missing',
        });
      }

      if (!ocrFirstName || !ocrLastName) {
        return reply.code(202).send({
          ok: true,
          status: 'approved_pending_ocr',
          reason: 'ocr_missing',
        });
      }

      if (pendingFirstName !== ocrFirstName || pendingLastName !== ocrLastName) {
        await deletePendingKyc(userId);
        return reply.code(409).send({
          error: 'OCR name mismatch. Please start verification again with exact ID name.',
          reason: 'ocr_mismatch',
        });
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            identityVerified: true,
            firstName: pendingFirstName,
            lastName: pendingLastName,
            name: `${pendingFirstName} ${pendingLastName}`.trim(),
            verificationSessionId: sessionId,
          },
        });
      });

      await deletePendingKyc(userId);

      const updated = await prisma.user.findUnique({ where: { id: userId } });
      return reply.send({ ok: true, user: updated, mobileNumber: extractedMobileNumber });
    } catch (error) {
      request.log.error(error);
      return reply.code(error.statusCode || 500).send({
        error: error.message || 'Failed to sync verification',
        providerStatus: error.providerStatus,
        providerResponse: error.providerResponse,
      });
    }
  });

  fastify.post('/webhooks/didit', async (request, reply) => {
    reply.code(200).send({ ok: true });

    const signatureHeader = request.headers['x-didit-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const rawBody = request.rawBody;

    try {
      if (!verifyWebhookSignature(rawBody, signature)) {
        return;
      }

      const parsedPayload = DiditWebhookSchema.safeParse(request.body || {});
      if (!parsedPayload.success) {
        return;
      }

      await processWebhook(parsedPayload.data, request);
    } catch (error) {
      request.log.error(error);
    }
  });
}
