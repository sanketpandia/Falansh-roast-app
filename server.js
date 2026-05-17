import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify();
const scores = [];
const MAX_ENTRIES = 100;
const TARGET_PLAYER = 'falansh';

const normalizeName = (value) => String(value || '').trim();
const isFalansh = (value) => normalizeName(value).toLowerCase() === TARGET_PLAYER;
const hasValidPassword = (body) => body?.password === '2026';

app.register(fastifyStatic, {
  root: __dirname
});

app.get('/api/scores', async () => {
  return { scores, count: scores.length, targetPlayer: 'Falansh' };
});

app.post('/api/add-score', async (request, reply) => {
  const body = request.body || {};

  if (!hasValidPassword(body)) {
    return reply.code(401).send({ error: 'Invalid password' });
  }

  if (scores.length >= MAX_ENTRIES) {
    return reply.code(429).send({ error: 'Max entries reached' });
  }

  const playerOneName = normalizeName(body.playerOneName);
  const playerTwoName = normalizeName(body.playerTwoName);
  const playerOneScore = Number(body.playerOneScore);
  const playerTwoScore = Number(body.playerTwoScore);

  if (!playerOneName || !playerTwoName) {
    return reply.code(400).send({ error: 'Both player names are required' });
  }

  if (!Number.isInteger(playerOneScore) || !Number.isInteger(playerTwoScore) || playerOneScore < 0 || playerTwoScore < 0) {
    return reply.code(400).send({ error: 'Scores must be non-negative whole numbers' });
  }

  const falanshPlayed = isFalansh(playerOneName) || isFalansh(playerTwoName);
  const falanshScore = isFalansh(playerOneName) ? playerOneScore : isFalansh(playerTwoName) ? playerTwoScore : null;
  const opponentName = isFalansh(playerOneName) ? playerTwoName : isFalansh(playerTwoName) ? playerOneName : null;
  const opponentScore = isFalansh(playerOneName) ? playerTwoScore : isFalansh(playerTwoName) ? playerOneScore : null;

  const entry = {
    id: Date.now(),
    playerOneName,
    playerTwoName,
    playerOneScore,
    playerTwoScore,
    falanshPlayed,
    opponentName,
    falanshScore,
    opponentScore,
    createdAt: new Date().toISOString()
  };

  scores.unshift(entry);

  return { success: true, entry, total: scores.length };
});

app.delete('/api/scores/:id', async (request, reply) => {
  const body = request.body || {};

  if (!hasValidPassword(body)) {
    return reply.code(401).send({ error: 'Invalid password' });
  }

  const id = Number(request.params.id);
  const index = scores.findIndex((score) => Number(score.id) === id);

  if (index === -1) {
    return reply.code(404).send({ error: 'Score not found' });
  }

  const [deleted] = scores.splice(index, 1);

  return { success: true, deleted, total: scores.length };
});

app.listen({ port: 3000, host: '0.0.0.0' });
