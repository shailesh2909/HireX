import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { CreateEventSchema, ScanTicketSchema } from "../schemas/event.schema.js";

const prisma = new PrismaClient();

const DEFAULT_WALLET_BALANCE = 1000;

async function ensureWallet(tx, userId) {
  const existing = await tx.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return tx.wallet.create({ data: { userId, balance: DEFAULT_WALLET_BALANCE } });
}

export async function listEvents(request, reply) {
  const events = await prisma.event.findMany({
    include: { tickets: true },
    orderBy: { eventDate: "desc" },
  });
  return reply.send(events);
}

export async function getWallet(request, reply) {
  const userId = request.headers["x-user-id"];
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });
  const wallet = await ensureWallet(prisma, userId);
  return reply.send(wallet);
}

export async function createEvent(request, reply) {
  const userId = request.headers["x-user-id"];
  const isVerified = request.headers["x-is-verified"] === "true";

  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const parsed = CreateEventSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

  const { title, ticketPrice, eventDate, posterUrl } = parsed.data;

  await ensureWallet(prisma, userId);

  const event = await prisma.event.create({
    data: {
      organizerId: userId,
      title,
      ticketPrice,
      upfrontPayoutRate: isVerified ? 0.3 : 0.0,
      eventDate: new Date(eventDate),
      posterUrl,
    },
  });

  return reply.code(201).send(event);
}

export async function buyTicket(request, reply) {
  const userId = request.headers["x-user-id"];
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { eventId } = request.params;

  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) throw { statusCode: 404, message: "Event not found" };
    if (event.status !== "PUBLISHED") throw { statusCode: 400, message: "Event is not available for purchase" };
    if (event.organizerId === userId) throw { statusCode: 400, message: "Organizer cannot buy own ticket" };

    const wallet = await ensureWallet(tx, userId);
    if (wallet.balance < event.ticketPrice) throw { statusCode: 400, message: "Insufficient balance" };

    const existing = await tx.ticket.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (existing) throw { statusCode: 409, message: "Already purchased a ticket for this event" };

    const amountForOrganizer = event.ticketPrice * event.upfrontPayoutRate;
    const amountForEscrow = event.ticketPrice - amountForOrganizer;

    await tx.wallet.update({
      where: { userId },
      data: { balance: { decrement: event.ticketPrice } },
    });

    if (amountForOrganizer > 0) {
      await ensureWallet(tx, event.organizerId);
      await tx.wallet.update({
        where: { userId: event.organizerId },
        data: { balance: { increment: amountForOrganizer } },
      });
    }

    await tx.event.update({
      where: { id: eventId },
      data: { escrowBalance: { increment: amountForEscrow } },
    });

    const checkInHash = crypto.randomBytes(32).toString("hex");

    const ticket = await tx.ticket.create({
      data: {
        eventId,
        userId,
        pricePaid: event.ticketPrice,
        checkInHash,
      },
    });

    return { ticket, checkInHash };
  });

  return reply.code(201).send(result);
}

export async function scanTicket(request, reply) {
  const userId = request.headers["x-user-id"];
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { eventId } = request.params;

  const parsed = ScanTicketSchema.safeParse(request.body);
  if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return reply.code(404).send({ error: "Event not found" });
  if (event.organizerId !== userId) return reply.code(403).send({ error: "Only the organizer can scan tickets" });

  const ticket = await prisma.ticket.findUnique({
    where: { checkInHash: parsed.data.checkInHash },
  });

  if (!ticket || ticket.eventId !== eventId) return reply.code(404).send({ error: "Invalid check-in hash" });
  if (ticket.status !== "VALID") return reply.code(400).send({ error: `Ticket already ${ticket.status.toLowerCase()}` });

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "USED", scannedAt: new Date() },
  });

  return reply.send(updated);
}

export async function cancelEvent(request, reply) {
  const userId = request.headers["x-user-id"];
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { eventId } = request.params;

  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({
      where: { id: eventId },
      include: { tickets: true },
    });

    if (!event) throw { statusCode: 404, message: "Event not found" };
    if (event.organizerId !== userId) throw { statusCode: 403, message: "Only the organizer can cancel" };
    if (event.status !== "PUBLISHED") throw { statusCode: 400, message: "Event cannot be cancelled in current state" };

    const activeTickets = event.tickets.filter((t) => t.status === "VALID" || t.status === "USED");
    const clawbackAmount = activeTickets.length * event.ticketPrice * event.upfrontPayoutRate;

    if (clawbackAmount > 0) {
      await tx.wallet.update({
        where: { userId: event.organizerId },
        data: { balance: { decrement: clawbackAmount } },
      });
    }

    for (const ticket of activeTickets) {
      await tx.wallet.update({
        where: { userId: ticket.userId },
        data: { balance: { increment: ticket.pricePaid } },
      });
    }

    await tx.ticket.updateMany({
      where: { eventId, status: { in: ["VALID", "USED"] } },
      data: { status: "REFUNDED" },
    });

    const updated = await tx.event.update({
      where: { id: eventId },
      data: { status: "CANCELLED", escrowBalance: 0 },
    });

    return updated;
  });

  return reply.send(result);
}

export async function settleEvent(request, reply) {
  const userId = request.headers["x-user-id"];
  if (!userId) return reply.code(401).send({ error: "Unauthorized" });

  const { eventId } = request.params;

  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({
      where: { id: eventId },
      include: { tickets: true },
    });

    if (!event) throw { statusCode: 404, message: "Event not found" };
    if (event.organizerId !== userId) throw { statusCode: 403, message: "Only the organizer can settle" };
    if (event.status !== "PUBLISHED") throw { statusCode: 400, message: "Event cannot be settled in current state" };

    const totalTickets = event.tickets.length;
    if (totalTickets === 0) throw { statusCode: 400, message: "No tickets sold" };

    const usedTickets = event.tickets.filter((t) => t.status === "USED").length;
    const attendanceRate = usedTickets / totalTickets;

    if (attendanceRate < 0.2) {
      const clawbackAmount = totalTickets * event.ticketPrice * event.upfrontPayoutRate;
      const totalRefundPool = event.escrowBalance + clawbackAmount;
      const refundPerBuyer = totalRefundPool / totalTickets;

      if (clawbackAmount > 0) {
        await tx.wallet.update({
          where: { userId: event.organizerId },
          data: { balance: { decrement: clawbackAmount } },
        });
      }

      for (const ticket of event.tickets) {
        await tx.wallet.update({
          where: { userId: ticket.userId },
          data: { balance: { increment: refundPerBuyer } },
        });
      }

      await tx.ticket.updateMany({
        where: { eventId },
        data: { status: "REFUNDED" },
      });

      const updated = await tx.event.update({
        where: { id: eventId },
        data: { status: "FRAUD_REFUNDED", escrowBalance: 0 },
      });

      return { ...updated, fraud: true, attendanceRate, refundPerBuyer };
    }

    await tx.wallet.update({
      where: { userId: event.organizerId },
      data: { balance: { increment: event.escrowBalance } },
    });

    const updated = await tx.event.update({
      where: { id: eventId },
      data: { status: "SETTLED", escrowBalance: 0 },
    });

    return { ...updated, fraud: false, attendanceRate };
  });

  return reply.send(result);
}
