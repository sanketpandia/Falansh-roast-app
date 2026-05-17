# Falansh FIFA Loss Tracker

A tiny static HTML frontend that reads FIFA game history from `games.json`, tracks losses for a target player, and shows the roast banner after repeated losses.

## Edit the data

Update `games.json` before deploying:

```json
{
  "roastTarget": "Falansh",
  "roastThreshold": 3,
  "players": ["Falansh", "Sanket", "Aditya"],
  "games": [
    {
      "id": "game-001",
      "playedAt": "2026-05-10T21:00:00+05:30",
      "scores": {
        "Falansh": 1,
        "Sanket": 3
      }
    }
  ]
}
```

Rules:

- `players` must have 1 to 9 unique names.
- Every game must have scores for 2 to 9 configured players.
- The highest scorer wins.
- If multiple players tie for the highest score, it is counted as a draw for those players.
- For the roast target, any game where they are not the highest scorer is a loss unless they tied for highest score.

## Run locally with Docker

```bash
docker build -t falansh-fifa-roast .
docker run --rm -p 8080:80 falansh-fifa-roast
```

Then open: http://localhost:8080

## Redeploy flow

1. Edit `games.json`.
2. Rebuild the image.
3. Redeploy the container.
4. Hard refresh the browser if it still shows the old data.
