# maciejwlodarski.com

Source of [maciejwlodarski.com](https://maciejwlodarski.com), the personal site and portfolio of Maciej Włodarski.

| Directory | What it is |
| --- | --- |
| [`web/`](web) | The site: TanStack Start, React, Tailwind CSS and shadcn/ui on Base UI, in Polish (`/`) and English (`/en`). |
| [`spotify-api/`](spotify-api) | A small Node.js service in Docker that reads Spotify and serves the feed for the site's music section. |

```sh
cd web && npm ci && npm run dev                                   # site on http://localhost:3000
cd spotify-api && MOCK=1 DATA_DIR=./data node server.mjs           # fictional music feed on :8810
```

Each directory has its own README with the details.

## Deploying the website

After committing and pushing the desired revision, run `./deploy.sh` on the
development machine. It connects to the configured `oracle` SSH host,
fast-forwards `~/docker/maciejwlodarski.com` on its `main` branch, and runs
the server-side deployment script from that revision. The server checkout must
have no tracked modifications. SSH, GitHub access on the server, Docker, `flock`,
`rsync`, and permission to use `sudo` are required.

The server builds the committed sources in a temporary directory using
`node:24-alpine`, verifies the static pages, and only then updates
`/var/www/maciejwlodarski.com`. A failed build leaves the live site alone. Before
publication the script saves a snapshot under `/var/backups/maciejwlodarski.com`;
on a failed file transfer it attempts to restore that snapshot. Snapshots are
retained for manual cleanup. File replacement is not fully atomic, and a host
crash or a failed restore can still require manual recovery from the snapshot.
One lock covers the pull and deployment to prevent overlapping runs. Published
directories use mode 755 and files mode 644; existing `.well-known` files are
left untouched.
The script deploys the static website only; it does not change the Spotify API.
Builds use the defaults documented in `web/README.md` and do not read untracked
server-side `.env` files.
