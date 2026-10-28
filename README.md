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
