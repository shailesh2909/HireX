import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { execSync } from 'node:child_process';
import diditRoutes from './routes/didit.js';
import imagekitRoutes from './routes/imagekit.js';
import postsRoutes from './routes/posts.js';
import communityRoutes from './routes/community.js';

const app = Fastify({ logger: true });
const PORT = process.env.PORT || 3001;

function ensureDatabaseSchema() {
  if (process.env.SKIP_PRISMA_DB_PUSH === 'true') {
    return;
  }

  try {
    execSync('npx prisma db push --skip-generate', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  } catch (error) {
    app.log.error(error, 'Prisma schema sync failed during startup');
    throw error;
  }
}

ensureDatabaseSchema();

await app.register(cors, { origin: true, credentials: true });

app.removeContentTypeParser('application/json');
app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
  request.rawBody = body;

  if (!body || !body.length) {
    done(null, {});
    return;
  }

  try {
    const parsed = JSON.parse(body);
    done(null, parsed);
  } catch (error) {
    error.statusCode = 400;
    done(error);
  }
});

app.get('/health', async () => ({ status: 'ok' }));

await app.register(diditRoutes, { prefix: '/api/auth' });
await app.register(imagekitRoutes, { prefix: '/api/imagekit' });
await app.register(postsRoutes, { prefix: '/api/posts' });
await app.register(communityRoutes, { prefix: '/api/community' });

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.code(error.statusCode || 500).send({ error: error.message || 'Internal server error' });
});

try {
  await app.listen({ port: Number(PORT), host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
