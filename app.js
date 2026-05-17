const CONFIG_FILE = "games.json";
const MAX_PLAYERS = 9;

const elements = {
  errorCard: document.querySelector("#error-card"),
  verdictCard: document.querySelector("#verdict-card"),
  verdictTitle: document.querySelector("#verdict-title"),
  verdictCopy: document.querySelector("#verdict-copy"),
  targetPlayer: document.querySelector("#target-player"),
  playerCount: document.querySelector("#player-count"),
  threshold: document.querySelector("#threshold"),
  targetMatches: document.querySelector("#target-matches"),
  wins: document.querySelector("#wins"),
  losses: document.querySelector("#losses"),
  lossStreak: document.querySelector("#loss-streak"),
  leaderboardBody: document.querySelector("#leaderboard-body"),
  historyList: document.querySelector("#history-list"),
  emptyState: document.querySelector("#empty-state"),
};

async function loadConfig() {
  const response = await fetch(CONFIG_FILE, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Could not load ${CONFIG_FILE}. Status: ${response.status}`);
  }

  return response.json();
}

function validateConfig(config) {
  if (!config || typeof config !== "object") {
    throw new Error("games.json must contain one JSON object.");
  }

  if (!Array.isArray(config.players)) {
    throw new Error("games.json must contain a players array.");
  }

  if (config.players.length === 0 || config.players.length > MAX_PLAYERS) {
    throw new Error(`players must contain 1 to ${MAX_PLAYERS} players.`);
  }

  const uniquePlayers = new Set(config.players);
  if (uniquePlayers.size !== config.players.length) {
    throw new Error("players must be unique.");
  }

  if (!uniquePlayers.has(config.roastTarget)) {
    throw new Error("roastTarget must exist inside players.");
  }

  if (!Array.isArray(config.games)) {
    throw new Error("games.json must contain a games array.");
  }

  config.games.forEach((game, index) => {
    if (!game.scores || typeof game.scores !== "object" || Array.isArray(game.scores)) {
      throw new Error(`Game ${index + 1} must contain a scores object.`);
    }

    const participants = Object.keys(game.scores);
    if (participants.length < 2 || participants.length > MAX_PLAYERS) {
      throw new Error(`Game ${index + 1} must have between 2 and ${MAX_PLAYERS} scored players.`);
    }

    participants.forEach((player) => {
      if (!uniquePlayers.has(player)) {
        throw new Error(`Game ${index + 1} uses unknown player: ${player}. Add them to players first.`);
      }

      const score = game.scores[player];
      if (!Number.isFinite(score) || score < 0) {
        throw new Error(`Game ${index + 1} has an invalid score for ${player}.`);
      }
    });
  });
}

function getSortedGames(games) {
  return [...games].sort((a, b) => new Date(a.playedAt ?? 0) - new Date(b.playedAt ?? 0));
}

function getGameResult(game, player) {
  const entries = Object.entries(game.scores);
  const playerScore = game.scores[player];

  if (playerScore === undefined) return "not-played";

  const topScore = Math.max(...entries.map(([, score]) => score));
  const winners = entries.filter(([, score]) => score === topScore).map(([name]) => name);

  if (winners.length > 1 && winners.includes(player)) return "draw";
  if (winners.includes(player)) return "win";
  return "loss";
}

function getCurrentLossStreak(games, player) {
  const targetGames = getSortedGames(games).filter((game) => game.scores[player] !== undefined);
  let streak = 0;

  for (let index = targetGames.length - 1; index >= 0; index -= 1) {
    if (getGameResult(targetGames[index], player) !== "loss") break;
    streak += 1;
  }

  return streak;
}

function buildPlayerStats(config) {
  const stats = new Map(
    config.players.map((player) => [
      player,
      { player, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
    ]),
  );

  config.games.forEach((game) => {
    const participants = Object.keys(game.scores);

    participants.forEach((player) => {
      const result = getGameResult(game, player);
      const playerStats = stats.get(player);
      const goalsAgainst = participants
        .filter((participant) => participant !== player)
        .reduce((total, opponent) => total + game.scores[opponent], 0);

      playerStats.played += 1;
      playerStats.goalsFor += game.scores[player];
      playerStats.goalsAgainst += goalsAgainst;

      if (result === "win") playerStats.wins += 1;
      if (result === "draw") playerStats.draws += 1;
      if (result === "loss") playerStats.losses += 1;
    });
  });

  return [...stats.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return b.goalsFor - a.goalsFor;
  });
}

function renderConfig(config) {
  elements.targetPlayer.textContent = config.roastTarget;
  elements.playerCount.textContent = config.players.length;
  elements.threshold.textContent = config.roastThreshold;
}

function renderVerdict(config, targetStats, streak) {
  const target = config.roastTarget;
  const threshold = Number(config.roastThreshold) || 3;
  const triggered = streak >= threshold;

  elements.verdictCard.classList.toggle("hidden", !triggered);
  elements.verdictTitle.textContent = `${target} is a lodu.`;
  elements.verdictCopy.textContent = `${target} has lost ${streak} game${streak === 1 ? "" : "s"} in a row out of ${targetStats.played} tracked appearances.`;
}

function renderStats(config, playerStats, streak) {
  const targetStats = playerStats.find((stats) => stats.player === config.roastTarget);

  elements.targetMatches.textContent = targetStats.played;
  elements.wins.textContent = targetStats.wins;
  elements.losses.textContent = targetStats.losses;
  elements.lossStreak.textContent = streak;

  renderVerdict(config, targetStats, streak);
}

function renderLeaderboard(playerStats) {
  elements.leaderboardBody.innerHTML = "";

  playerStats.forEach((stats) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${stats.player}</strong></td>
      <td>${stats.played}</td>
      <td>${stats.wins}</td>
      <td>${stats.draws}</td>
      <td>${stats.losses}</td>
      <td>${stats.goalsFor}</td>
      <td>${stats.goalsAgainst}</td>
    `;
    elements.leaderboardBody.appendChild(row);
  });
}

function formatDate(value) {
  if (!value) return "Date not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function renderHistory(config) {
  const sortedGames = getSortedGames(config.games).reverse();

  elements.historyList.innerHTML = "";
  elements.emptyState.hidden = sortedGames.length > 0;

  sortedGames.forEach((game) => {
    const item = document.createElement("li");
    const scoreline = Object.entries(game.scores)
      .map(([player, score]) => `${player} ${score}`)
      .join(" · ");
    const targetResult = getGameResult(game, config.roastTarget);

    item.innerHTML = `
      <div>
        <strong>${scoreline}</strong>
        <div class="muted">${formatDate(game.playedAt)}</div>
      </div>
      <span class="badge ${targetResult}">${targetResult.replace("-", " ").toUpperCase()}</span>
    `;

    elements.historyList.appendChild(item);
  });
}

function showError(error) {
  elements.errorCard.classList.remove("hidden");
  elements.errorCard.innerHTML = `
    <h2>Config error</h2>
    <p>${error.message}</p>
    <p class="muted">Fix <code>${CONFIG_FILE}</code>, rebuild the Docker image, and redeploy.</p>
  `;
}

async function init() {
  try {
    const config = await loadConfig();
    validateConfig(config);

    const playerStats = buildPlayerStats(config);
    const streak = getCurrentLossStreak(config.games, config.roastTarget);

    renderConfig(config);
    renderStats(config, playerStats, streak);
    renderLeaderboard(playerStats);
    renderHistory(config);
  } catch (error) {
    showError(error);
  }
}

init();
