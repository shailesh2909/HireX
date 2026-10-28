import Fastify from 'fastify';
import Redis from 'ioredis';
import recommendationRoutes from './routes/recommendation.routes.js';

const fastify = Fastify({ logger: false });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

fastify.decorate('redis', redis);
fastify.register(recommendationRoutes, { prefix: '/api/recommendations' });

const start = async () => {
  try {
    await fastify.listen({ port: 3005, host: '0.0.0.0' });
    console.log('Server running on port 3005');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
