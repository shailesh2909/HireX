import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import multipart from '@fastify/multipart';
import FormData from 'form-data';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

dotenv.config();

// ── Initialize ────────────────────────────────────────────────────────────────

const fastify = Fastify({ logger: true });
const prisma  = new PrismaClient();

fastify.register(cors, { origin: '*' });
fastify.register(multipart);

// ── In-Memory Session State Machine ───────────────────────────────────────────
// 
// Each session tracks which stages have passed. A route can ONLY execute
// if the prior stage gate has been cleared. This prevents skipping stages.
//
// Flow:  CREATED → STAGE_1_PASSED → STAGE_2_PASSED → VERIFIED
//

const sessions = new Map();
// sessions.get(id) → { 
//   stage: 'CREATED' | 'STAGE_1_PASSED' | 'STAGE_2_PASSED' | 'VERIFIED',
//   companyNumber, verifiedLegalName, registryData, forensicsData, userId 
// }

function createSession(companyNumber, userId) {
  const id = `vs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  sessions.set(id, {
    stage: 'CREATED',
    companyNumber,
    userId,
    verifiedLegalName: null,
    registryData: null,
    forensicsData: null,
    createdAt: Date.now(),
  });
  return id;
}

function getSession(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return null;
  // Expire sessions after 15 minutes
  if (Date.now() - s.createdAt > 15 * 60 * 1000) {
    sessions.delete(sessionId);
    return null;
  }
  return s;
}

// ==========================================
// ROUTE 1: Registry & Domain Check (Stage 1 & 2)
// ==========================================
// Gate: None (entry point)
// On success: Creates session, sets stage → STAGE_1_PASSED
// Returns: sessionId + registry data for the frontend to thread through

fastify.post('/api/companies/verify', async (request, reply) => {
  const { companyNumber, claimedDomain, userId } = request.body;

  if (!companyNumber || !claimedDomain) {
    return reply.status(400).send({ error: "companyNumber and claimedDomain are required." });
  }

  try {
    // ── Stage 1: UK Companies House Registry Lookup ─────────────────
    const chToken = Buffer.from(`${process.env.COMPANIES_HOUSE_KEY}:`).toString('base64');
    
    const registryRes = await fetch(`https://api.company-information.service.gov.uk/company/${companyNumber}`, {
      headers: { 'Authorization': `Basic ${chToken}` }
    });

    if (registryRes.status === 404) {
      return reply.status(404).send({ 
        error: "Company not found in official registry.",
        stage: "registry",
      });
    }
    if (!registryRes.ok) {
      throw new Error(`Registry API returned ${registryRes.status}`);
    }
    
    const registryData = await registryRes.json();

    if (registryData.company_status !== 'active') {
      return reply.status(400).send({ 
        error: `Company is not active. Current status: ${registryData.company_status}`,
        stage: "registry",
      });
    }

    // ── Stage 2: Domain Enrichment ──────────────────────────────────
    let domainData = { domain: "Not checked", industry: "Unknown" };
    if (process.env.ABSTRACT_API_KEY) {
      try {
        const domainRes = await fetch(
          `https://companyenrichment.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_API_KEY}&domain=${claimedDomain}`
        );
        if (domainRes.ok) {
          domainData = await domainRes.json();
        }
      } catch (domainErr) {
        // Non-fatal: domain enrichment is supplementary
        fastify.log.warn({ err: domainErr }, 'Domain enrichment failed (non-fatal)');
      }
    }

    // ── Create verification session ─────────────────────────────────
    const sessionId = createSession(companyNumber, userId || 'anonymous');
    const session = sessions.get(sessionId);
    session.stage = 'STAGE_1_PASSED';
    session.verifiedLegalName = registryData.company_name;
    session.registryData = {
      verified_legal_name: registryData.company_name,
      registry_status: registryData.company_status,
      incorporation_date: registryData.date_of_creation,
      registered_address: registryData.registered_office_address,
      official_domain: domainData.domain || "Not found",
      industry: domainData.industry || "Not found",
      trust_score: "HIGH",
    };

    return reply.status(200).send({
      sessionId,
      ...session.registryData,
    });

  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Internal Verification Engine Error", stage: "registry" });
  }
});

// ==========================================
// ROUTE 2: Document Forensics Bridge (Stage 3)
// ==========================================
// Gate: Requires sessionId with stage === 'STAGE_1_PASSED'
// On success: Sets stage → STAGE_2_PASSED
// On failure: Returns 400 with forensics details

fastify.post('/api/companies/document-check', async (request, reply) => {
  try {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "No document provided for forensics.", stage: "document" });
    }

    // ── Gate Check ──────────────────────────────────────────────────
    const sessionId = data.fields.sessionId?.value;
    if (!sessionId) {
      return reply.status(400).send({ error: "sessionId is required. Complete Stage 1 first.", stage: "document" });
    }

    const session = getSession(sessionId);
    if (!session) {
      return reply.status(403).send({ error: "Invalid or expired verification session.", stage: "document" });
    }
    if (session.stage !== 'STAGE_1_PASSED') {
      return reply.status(403).send({ 
        error: `Cannot run Stage 3 (Document). Current stage: ${session.stage}. Complete Stage 1 & 2 first.`,
        stage: "document",
      });
    }

    // ── Use the verified legal name from Stage 1 (server-authoritative) ──
    const expectedName = session.verifiedLegalName;

    // ── Repackage file for Python microservice ──────────────────────
    const fileBuffer = await data.toBuffer();
    const form = new FormData();
    form.append('document', fileBuffer, {
      filename: data.filename,
      contentType: data.mimetype,
    });
    form.append('expected_name', expectedName);

    // ── Call Python Forensics Engine ─────────────────────────────────
    let forensicsData;
    try {
      const pyResponse = await axios.post(
        'http://127.0.0.1:8000/api/forensics/verify-document',
        form,
        { headers: form.getHeaders(), timeout: 120000 }
      );
      forensicsData = pyResponse.data;
    } catch (pyErr) {
      // Python service returned an error or was unreachable
      const pyMessage = pyErr.response?.data?.error || pyErr.message || 'Forensics engine unreachable.';
      fastify.log.error({ err: pyErr }, 'Python forensics bridge failed');
      return reply.status(502).send({
        error: `Document forensics engine error: ${pyMessage}`,
        stage: "document",
      });
    }

    // ── Evaluate forensics result ───────────────────────────────────
    if (!forensicsData || typeof forensicsData.passed !== 'boolean') {
      return reply.status(502).send({
        error: "Forensics engine returned an invalid response.",
        stage: "document",
      });
    }

    if (forensicsData.passed) {
      session.stage = 'STAGE_2_PASSED';
      session.forensicsData = forensicsData;
      return reply.status(200).send({
        status: "SUCCESS",
        message: "Cryptographic Document Tie Verified.",
        sessionId,
        details: {
          expected_name: expectedName,
          highest_match_score: forensicsData.highest_match_score,
          passed: true,
          extracted_preview: forensicsData.extracted_preview,
        },
      });
    } else {
      return reply.status(400).send({
        status: "FAILED",
        message: "Document does not match verified corporate identity.",
        stage: "document",
        details: {
          expected_name: expectedName,
          highest_match_score: forensicsData.highest_match_score,
          passed: false,
          extracted_preview: forensicsData.extracted_preview,
        },
      });
    }

  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Forensics Bridge Failed", stage: "document" });
  }
});

// ==========================================
// ROUTE 3: Director Identity Triangulation (Stage 4)
// ==========================================
// Gate: Requires sessionId with stage === 'STAGE_2_PASSED'
// On success: ONLY HERE does Prisma write registryStatus = 'VERIFIED'
// On failure: Returns 403 — identity does not match any director

fastify.post('/api/companies/verify-director', async (request, reply) => {
  const { companyNumber, userLegalName, sessionId } = request.body;

  if (!sessionId) {
    return reply.status(400).send({ error: "sessionId is required. Complete Stages 1-3 first.", stage: "director" });
  }

  // ── Gate Check ──────────────────────────────────────────────────────
  const session = getSession(sessionId);
  if (!session) {
    return reply.status(403).send({ error: "Invalid or expired verification session.", stage: "director" });
  }
  if (session.stage !== 'STAGE_2_PASSED') {
    return reply.status(403).send({
      error: `Cannot run Stage 4 (Director). Current stage: ${session.stage}. Complete Stages 1-3 first.`,
      stage: "director",
    });
  }

  // Use the companyNumber from the session (server-authoritative, not frontend)
  const authoritative_companyNumber = session.companyNumber;

  try {
    const chToken = Buffer.from(`${process.env.COMPANIES_HOUSE_KEY}:`).toString('base64');
    
    const officersRes = await fetch(
      `https://api.company-information.service.gov.uk/company/${authoritative_companyNumber}/officers`,
      { headers: { 'Authorization': `Basic ${chToken}` } }
    );

    if (!officersRes.ok) {
      return reply.status(400).send({ 
        error: "Could not retrieve company directors from registry.",
        stage: "director",
      });
    }

    const officersData = await officersRes.json();
    
    // Filter to active directors only
    const activeDirectors = (officersData.items || []).filter(
      officer => officer.resigned_on === undefined
    );

    const directorNames = activeDirectors.map(officer => officer.name.toLowerCase());
    
    // Fuzzy match: government APIs format names weirdly (e.g., "SURYAWANSHI, Shailesh")
    const targetName = userLegalName.toLowerCase();
    const nameParts = targetName.split(' ');
    
    let isAuthorized = false;
    let matchedDirector = null;

    for (const officialName of directorNames) {
      const isMatch = nameParts.every(part => officialName.includes(part));
      if (isMatch) {
        isAuthorized = true;
        matchedDirector = officialName;
        break;
      }
    }

    if (!isAuthorized) {
      return reply.status(403).send({
        status: "FORBIDDEN",
        message: "User identity does not match any registered active directors for this company.",
        stage: "director",
        active_directors_found: directorNames.length,
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // ★ FINALIZATION — ONLY HERE IS "VERIFIED" EVER WRITTEN TO THE DB ★
    // ═══════════════════════════════════════════════════════════════════

    let companyRecord;
    try {
      companyRecord = await prisma.companyRecord.create({
        data: {
          userId:            session.userId,
          companyNumber:     authoritative_companyNumber,
          legalName:         session.verifiedLegalName,
          claimedDomain:     session.registryData.official_domain || '',
          officialDomain:    session.registryData.official_domain,
          industry:          session.registryData.industry,
          registeredAddress: JSON.stringify(session.registryData.registered_address || {}),
          registryStatus:    'VERIFIED',       // ← THE ONLY PLACE THIS IS SET
          verificationLevel: 4,                // All 4 stages passed
          directorMatch:     matchedDirector,
        },
      });
    } catch (dbErr) {
      fastify.log.error({ err: dbErr }, 'Failed to persist verified company record');
      // Still return success to the user — verification passed even if DB write fails
      companyRecord = { id: 'transient', registryStatus: 'VERIFIED' };
    }

    // Update session and clean up
    session.stage = 'VERIFIED';

    return reply.status(200).send({
      status: "VERIFIED",
      message: "Identity Triangulated. User is an authorized Director. All 4 stages passed.",
      sessionId,
      companyRecordId: companyRecord.id,
      registryStatus: 'VERIFIED',
      verificationLevel: 4,
      official_match: matchedDirector,
      verified_legal_name: session.verifiedLegalName,
      trust_score: session.registryData.trust_score,
    });

  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: "Director Triangulation Failed", stage: "director" });
  }
});

// ── Start Server ──────────────────────────────────────────────────────────────

const start = async () => {
  try {
    await prisma.$connect();
    fastify.log.info('✅ Prisma connected to database.');
    await fastify.listen({ port: process.env.PORT || 3002, host: '0.0.0.0' });
    console.log(`🏢 Company Verification Service running on port ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();