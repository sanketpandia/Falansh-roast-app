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
const normalizeKey = (value) => normalizeName(value).toLowerCase();
const isFalansh = (value) => normalizeKey(value) === TARGET_PLAYER;
const hasValidPassword = (body) => body?.password === '2026';

function buildLeaderboard() {
  const players = new Map();

  function ensurePlayer(name) {
    const key = normalizeKey(name);
    if (!players.has(key)) {
      players.set(key, {
        name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      });
    }
    return players.get(key);
  }

  for (const match of scores) {
    const one = ensurePlayer(match.playerOneName);
    const two = ensurePlayer(match.playerTwoName);

    one.played += 1;
    two.played += 1;
    one.goalsFor += match.playerOneScore;
    one.goalsAgainst += match.playerTwoScore;
    two.goalsFor += match.playerTwoScore;
    two.goalsAgainst += match.playerOneScore;

    if (match.playerOneScore > match.playerTwoScore) {
      one.wins += 1;
      one.points += 3;
      two.losses += 1;
    } else if (match.playerTwoScore > match.playerOneScore) {
      two.wins += 1;
      two.points += 3;
      one.losses += 1;
    } else {
      one.draws += 1;
      two.draws += 1;
      one.points += 1;
      two.points += 1;
    }
  }

  return [...players.values()]
    .map((player) => ({ ...player, goalDifference: player.goalsFor - player.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name));
}

app.register(fastifyStatic, {
  root: __dirname
});

app.get('/api/scores', async () => {
  return { scores, count: scores.length, targetPlayer: 'Falansh' };
});

app.get('/api/matches', async () => {
  return { matches: scores, count: scores.length };
});

app.get('/api/leaderboard', async () => {
  return { leaderboard: buildLeaderboard(), count: scores.length };
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
