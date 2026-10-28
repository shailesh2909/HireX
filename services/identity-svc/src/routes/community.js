import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') return null;
  if (!authorizationHeader.startsWith('Bearer ')) return null;
  return authorizationHeader.slice(7).trim();
}

function requireAuthenticatedUserId(request, reply) {
  const authHeader = request.headers.authorization;
  const token = getBearerToken(authHeader);
  if (!token) {
    reply.code(401).send({ error: 'Missing or invalid authorization header' });
    return null;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id;
  } catch (err) {
    reply.code(401).send({ error: 'Invalid or expired token' });
    return null;
  }
}

export default async function communityRoutes(fastify) {
  // --- JOBS ---

  // GET /api/community/jobs
  fastify.get('/jobs', async (request, reply) => {
    try {
      const jobs = await prisma.job.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return reply.send(jobs);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch jobs' });
    }
  });

  // POST /api/community/jobs
  fastify.post('/jobs', async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply);
    if (!userId) return;

    const { title, company, location, tag, description } = request.body || {};
    if (!title || !description) {
      return reply.code(400).send({ error: 'Title and description are required' });
    }

    try {
      const job = await prisma.job.create({
        data: {
          id: crypto.randomUUID(),
          authorId: userId,
          title,
          company: company || 'Verified Business',
          location: location || 'Remote',
          tag: tag || 'Hiring',
          description,
          updatedAt: new Date(),
        }
      });
      return reply.send(job);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create job' });
    }
  });

  // --- NETWORK ---

  // GET /api/community/network/discover
  fastify.get('/network/discover', async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply);
    if (!userId) return;

    try {
      // Find users that are NOT me and NOT already connected
      const connections = await prisma.connection.findMany({
        where: {
          OR: [{ requesterId: userId }, { receiverId: userId }]
        }
      });
      const connectedIds = new Set([userId]);
      connections.forEach(c => {
        connectedIds.add(c.requesterId);
        connectedIds.add(c.receiverId);
      });

      const users = await prisma.user.findMany({
        where: {
          id: { notIn: Array.from(connectedIds) }
        },
        take: 10
      });

      return reply.send(users.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role === 'business' ? 'Business' : 'Professional',
        company: u.companyName || '',
        note: u.role === 'business' ? 'Verified Business Entity' : 'Verified Professional',
        connected: false
      })));
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch discover list' });
    }
  });

  // GET /api/community/network/my
  fastify.get('/network/my', async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply);
    if (!userId) return;

    try {
      const connections = await prisma.connection.findMany({
        where: {
          OR: [
            { requesterId: userId },
            { receiverId: userId }
          ],
          status: 'ACCEPTED'
        }
      });

      const otherIds = connections.map(c => c.requesterId === userId ? c.receiverId : c.requesterId);
      const users = await prisma.user.findMany({
        where: { id: { in: otherIds } }
      });

      return reply.send(users.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role === 'business' ? 'Business' : 'Professional',
        company: u.companyName || '',
        note: 'Connected',
        connected: true
      })));
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch connections' });
    }
  });

  // POST /api/community/network/connect
  fastify.post('/network/connect', async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply);
    if (!userId) return;

    const { targetId } = request.body || {};
    if (!targetId) return reply.code(400).send({ error: 'Target ID is required' });

    try {
      const conn = await prisma.connection.create({
        data: {
          id: crypto.randomUUID(),
          requesterId: userId,
          receiverId: targetId,
          status: 'ACCEPTED' // Auto-accept for demo
        }
      });
      return reply.send(conn);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to connect' });
    }
  });
  // --- EVENTS ---

  // GET /api/community/events
  fastify.get('/events', async (request, reply) => {
    try {
      const events = await prisma.event.findMany({
        include: { tickets: true },
        orderBy: { eventDate: 'asc' }
      });
      return reply.send(events);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch events' });
    }
  });

  // POST /api/community/events
  fastify.post('/events', async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply);
    if (!userId) return;

    const { title, description, eventDate, venue, ticketPrice, capacity } = request.body || {};
    if (!title || !eventDate) {
      return reply.code(400).send({ error: 'Title and eventDate are required' });
    }

    try {
      const event = await prisma.event.create({
        data: {
          id: crypto.randomUUID(),
          authorId: userId,
          title,
          description: description || '',
          eventDate: new Date(eventDate),
          venue: venue || 'Online',
          ticketPrice: Number(ticketPrice) || 0,
          capacity: Number(capacity) || 100,
          status: 'PUBLISHED',
        }
      });
      return reply.send(event);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to create event' });
    }
  });

  // POST /api/community/events/:id/buy
  fastify.post('/events/:id/buy', async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply);
    if (!userId) return;

    const eventId = request.params.id;

    try {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return reply.code(404).send({ error: 'Event not found' });

      const ticket = await prisma.ticket.create({
        data: {
          id: crypto.randomUUID(),
          eventId,
          userId,
          price: event.ticketPrice,
        }
      });

      // Update event escrow balance
      await prisma.event.update({
        where: { id: eventId },
        data: { escrowBalance: { increment: event.ticketPrice } }
      });

      return reply.send(ticket);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to purchase ticket' });
    }
  });

  // DELETE /api/community/events/:id
  fastify.delete('/events/:id', async (request, reply) => {
    const userId = requireAuthenticatedUserId(request, reply);
    if (!userId) return;

    const eventId = request.params.id;

    try {
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return reply.code(404).send({ error: 'Event not found' });
      if (event.authorId !== userId) return reply.code(403).send({ error: 'Unauthorized' });

      // Delete tickets first
      await prisma.ticket.deleteMany({ where: { eventId } });
      await prisma.event.delete({ where: { id: eventId } });

      return reply.send({ success: true });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete event' });
    }
  });
}
