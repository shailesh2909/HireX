import {
  listEvents,
  getWallet,
  createEvent,
  buyTicket,
  scanTicket,
  cancelEvent,
  settleEvent,
} from "../controllers/event.controller.js";

export default async function eventRoutes(fastify) {
  fastify.get("/", listEvents);
  fastify.get("/wallet", getWallet);
  fastify.post("/", createEvent);
  fastify.post("/:eventId/buy", buyTicket);
  fastify.post("/:eventId/scan", scanTicket);
  fastify.post("/:eventId/cancel", cancelEvent);
  fastify.post("/:eventId/settle", settleEvent);
}
