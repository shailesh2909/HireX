import "dotenv/config";
import Fastify from "fastify";
import eventRoutes from "./routes/event.routes.js";

const fastify = Fastify({ logger: true });

fastify.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode || 500;
  reply.code(statusCode).send({
    error: error.message || "Internal Server Error",
  });
});

fastify.register(eventRoutes, { prefix: "/api/events" });

fastify.get("/health", async () => ({ status: "ok", service: "event-svc" }));

const start = async () => {
  try {
    await fastify.listen({ port: 3006, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
