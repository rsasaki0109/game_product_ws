# Death High Roller (MVP / POC)

Browser-playable proof-of-concept: **Explore -> ALL-IN Blackjack -> (Lose) -> Haunt chase -> Safe zone**.

## Run (Dev)

```sh
npm ci
npm run dev
```

## Build / Preview (Share Locally)

```sh
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

## Controls

- `WASD`: Move
- `Space`: Jump
- `Click`: Lock cursor (pointer lock)
- `Esc`: Unlock cursor

Gameplay:
- Near table: `E` Sit at table
- Table: `Enter` Deal (ALL-IN)
- Table: `H` Hit / `F` Stand
- Table: `E` Leave (after resolution, except when you lost)
- Dead: `R` Restart
