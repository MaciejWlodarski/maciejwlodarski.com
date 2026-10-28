# Spotify feed API

A small Node.js service for the music section of [maciejwlodarski.com](https://maciejwlodarski.com)
(the site itself lives in [`../web`](../web)).
It reads the owner's currently playing track, recent plays, and top artists and
tracks from Spotify, then exposes a read-only JSON feed. Recent plays are saved
in SQLite so the site can show listening history over time.

## Local demo

Node.js 24 or newer is required. The mock feed contains fictional data and does
not connect to Spotify:

```sh
mkdir -p data
MOCK=1 DATA_DIR=./data node server.mjs
```

The default endpoints are <http://127.0.0.1:8810/spotify/feed> and
<http://127.0.0.1:8810/health>. The frontend can point to another endpoint with
its `VITE_MUSIC_FEED` build-time variable.

## Spotify configuration

Copy `.env.example` to `.env` and configure the Spotify application, callback
URL, an admin key, and allowed frontend origins. The service reads environment
variables supplied by the process; `docker compose up --build` loads `.env` via
the included Compose file. The login route starts the owner's Spotify OAuth
flow and requires the configured admin key.

The SQLite data directory contains listening history and the Spotify refresh
token. Keep it and the `.env` file private, and use HTTPS and an appropriately
protected deployment when running the service outside a local environment.
The container runs as the `node` user (uid 1000), so the host `data` directory
must be writable by that uid, for example `sudo chown 1000:1000 data`.

## Endpoints

- `GET /spotify/feed` — the read-only feed used by the website.
- `GET /spotify/login` — starts the owner's authorized login flow.
- `GET /spotify/callback` — Spotify OAuth callback.
- `GET /health` — liveness check.
