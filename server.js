import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify();
const scores = [];
const MAX_ENTRIES = 100;

app.register(fastifyStatic, {
  root: path.join(__dirname, 'public')
});

app.get('/api/scores', async () => {
  return { scores, count: scores.length };
});

app.post('/api/add-score', async (request, reply) => {
  const body = request.body || {};

  if (body.password !== '2026') {
    return reply.code(401).send({ error: 'Invalid password' });
  }

  if (scores.length >= MAX_ENTRIES) {
    return reply.code(429).send({ error: 'Max entries reached' });
  }

  const entry = {
    id: Date.now(),
    playerScore: body.playerScore,
    falanshScore: body.falanshScore,
    createdAt: new Date().toISOString()
  };

  scores.unshift(entry);

  return { success: true, entry, total: scores.length };
});

app.listen({ port: 3000, host: '0.0.0.0' });
