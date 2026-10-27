/*
 * Spotify feed for maciejwlodarski.com.
 *
 * Holds the owner's refresh token, polls the Web API, stores every play in
 * SQLite (the API itself only returns the last 50) and serves one public,
 * read-only JSON document for the "Czego słucham" module.
 *
 *   GET /spotify/feed       public feed, CORS for ALLOWED_ORIGINS
 *   GET /spotify/login      one-time owner login, needs ?key=ADMIN_KEY
 *   GET /spotify/callback   OAuth redirect target
 *   GET /health             liveness for Docker
 *
 * MOCK=1 serves invented data and never talks to Spotify (local development).
 */
import { createServer } from "node:http"
import { randomBytes, timingSafeEqual } from "node:crypto"
import { DatabaseSync } from "node:sqlite"
import { mkdirSync } from "node:fs"

const env = process.env
const PORT = +(env.PORT ?? 8810)
const MOCK = env.MOCK === "1"
const CLIENT_ID = env.SPOTIFY_CLIENT_ID ?? ""
const CLIENT_SECRET = env.SPOTIFY_CLIENT_SECRET ?? ""
const REDIRECT_URI = env.SPOTIFY_REDIRECT_URI ?? "https://api.maciejwlodarski.com/spotify/callback"
const ADMIN_KEY = env.ADMIN_KEY ?? ""
const ORIGINS = (env.ALLOWED_ORIGINS ?? "https://maciejwlodarski.com,https://www.maciejwlodarski.com").split(",").map((s) => s.trim())
const DATA_DIR = env.DATA_DIR ?? "/data"
const SCOPES = "user-read-currently-playing user-read-recently-played user-top-read"

const NOW_EVERY = 30_000
const RECENT_EVERY = 3 * 60_000
const TOP_EVERY = 6 * 60 * 60_000

const log = (...a) => console.log(new Date().toISOString(), ...a)

// ---------- storage ----------

mkdirSync(DATA_DIR, { recursive: true })
const db = new DatabaseSync(`${DATA_DIR}/spotify.db`)
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS plays (
    played_at TEXT PRIMARY KEY, track_id TEXT, name TEXT, artists TEXT,
    album TEXT, image TEXT, url TEXT, duration_ms INTEGER
  );
`)
const getKv = (k) => db.prepare("SELECT v FROM kv WHERE k = ?").get(k)?.v ?? null
const setKv = (k, v) => db.prepare("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(k, v)
const insertPlay = db.prepare(
  "INSERT OR IGNORE INTO plays (played_at, track_id, name, artists, album, image, url, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
)

// ---------- Spotify ----------

let access = { token: "", until: 0 }

async function tokenRequest(params) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  })
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`)
  return res.json()
}

async function accessToken() {
  if (access.token && Date.now() < access.until) return access.token
  const refresh = getKv("refresh_token")
  if (!refresh) return null
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: refresh })
  // Spotify may rotate the refresh token
  if (t.refresh_token) setKv("refresh_token", t.refresh_token)
  access = { token: t.access_token, until: Date.now() + (t.expires_in - 60) * 1000 }
  return access.token
}

async function api(path) {
  const token = await accessToken()
  if (!token) return null
  const res = await fetch(`https://api.spotify.com/v1${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 204) return null
  if (res.status === 401) access.until = 0
  if (res.status === 429) throw new Error(`rate limited, retry after ${res.headers.get("retry-after")} s`)
  if (!res.ok) throw new Error(`${path} ${res.status}`)
  return res.json()
}

// only what the page shows; album art keeps Spotify's own image, uncropped
const image = (images = [], want = 300) => [...images].sort((a, b) => Math.abs(a.width - want) - Math.abs(b.width - want))[0]?.url ?? null
const track = (t) => ({
  id: t.id,
  name: t.name,
  artists: t.artists.map((a) => a.name),
  album: t.album?.name ?? "",
  image: image(t.album?.images),
  url: t.external_urls?.spotify ?? null,
  durationMs: t.duration_ms,
})
const artist = (a) => ({ name: a.name, image: image(a.images), url: a.external_urls?.spotify ?? null, genres: a.genres?.slice(0, 2) ?? [] })

const state = { now: null, top: { artists: [], tracks: [] }, updatedAt: null, error: null }

async function pollNow() {
  const r = await api("/me/player/currently-playing")
  state.now = r?.item && r.currently_playing_type === "track" ? { playing: r.is_playing, progressMs: r.progress_ms, at: Date.now(), track: track(r.item) } : null
}

async function pollRecent() {
  const r = await api("/me/player/recently-played?limit=50")
  for (const it of r?.items ?? []) {
    const t = track(it.track)
    insertPlay.run(it.played_at, t.id, t.name, JSON.stringify(t.artists), t.album, t.image, t.url, t.durationMs)
  }
}

async function pollTop() {
  const [a, t] = await Promise.all([api("/me/top/artists?time_range=short_term&limit=8"), api("/me/top/tracks?time_range=short_term&limit=8")])
  state.top = { artists: (a?.items ?? []).map(artist), tracks: (t?.items ?? []).map(track) }
}

function every(ms, fn, name) {
  const run = async () => {
    if (!getKv("refresh_token")) return
    try {
      await fn()
      state.updatedAt = new Date().toISOString()
      state.error = null
    } catch (e) {
      state.error = String(e.message ?? e)
      log(name, "failed:", state.error)
    }
  }
  run()
  setInterval(run, ms).unref()
}

// ---------- feed ----------

function history() {
  const rows = db.prepare("SELECT played_at, artists, duration_ms FROM plays WHERE played_at >= ? ORDER BY played_at").all(
    new Date(Date.now() - 365 * 86_400_000).toISOString()
  )
  const months = new Map()
  for (const r of rows) {
    const key = r.played_at.slice(0, 7)
    const m = months.get(key) ?? { month: key, plays: 0, minutes: 0, artists: new Map() }
    m.plays++
    m.minutes += r.duration_ms / 60_000
    const lead = JSON.parse(r.artists)[0]
    if (lead) m.artists.set(lead, (m.artists.get(lead) ?? 0) + 1)
    months.set(key, m)
  }
  return [...months.values()].map((m) => ({
    month: m.month,
    plays: m.plays,
    minutes: Math.round(m.minutes),
    topArtist: [...m.artists.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
  }))
}

function recent() {
  return db
    .prepare("SELECT * FROM plays ORDER BY played_at DESC LIMIT 10")
    .all()
    .map((r) => ({ id: r.track_id, name: r.name, artists: JSON.parse(r.artists), album: r.album, image: r.image, url: r.url, durationMs: r.duration_ms, playedAt: r.played_at }))
}

function feed() {
  if (MOCK) return mockFeed()
  const now = state.now && { ...state.now, progressMs: state.now.playing ? state.now.progressMs + (Date.now() - state.now.at) : state.now.progressMs }
  if (now) delete now.at
  const since = db.prepare("SELECT MIN(played_at) AS first FROM plays").get()?.first ?? null
  return { connected: !!getKv("refresh_token"), updatedAt: state.updatedAt, now, recent: recent(), top: state.top, history: history(), historySince: since }
}

// ---------- http ----------

const pending = new Map() // OAuth state -> expiry

function safeEqual(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

function send(res, status, body, headers = {}) {
  const json = typeof body !== "string"
  res.writeHead(status, { "Content-Type": json ? "application/json; charset=utf-8" : "text/html; charset=utf-8", ...headers })
  res.end(json ? JSON.stringify(body) : body)
}

const page = (title, text) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:17px system-ui;max-width:32em;margin:15vh auto;padding:0 1em"><h1 style="font-size:24px">${title}</h1><p>${text}</p>`

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://local")
  const origin = req.headers.origin
  const cors = origin && ORIGINS.includes(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}
  try {
    if (url.pathname === "/health") return send(res, 200, { ok: true })

    if (url.pathname === "/spotify/feed") {
      if (req.method === "OPTIONS") return send(res, 204, "", { ...cors, "Access-Control-Allow-Methods": "GET" })
      return send(res, 200, feed(), { ...cors, "Cache-Control": "public, max-age=15" })
    }

    if (url.pathname === "/spotify/login") {
      if (!ADMIN_KEY || !safeEqual(url.searchParams.get("key") ?? "", ADMIN_KEY)) return send(res, 403, page("Brak dostępu", "Ten adres wymaga klucza właściciela."))
      const s = randomBytes(16).toString("hex")
      pending.set(s, Date.now() + 10 * 60_000)
      const q = new URLSearchParams({ response_type: "code", client_id: CLIENT_ID, scope: SCOPES, redirect_uri: REDIRECT_URI, state: s })
      res.writeHead(302, { Location: `https://accounts.spotify.com/authorize?${q}` })
      return res.end()
    }

    if (url.pathname === "/spotify/callback") {
      const s = url.searchParams.get("state") ?? ""
      const ok = (pending.get(s) ?? 0) > Date.now()
      pending.delete(s)
      if (!ok) return send(res, 400, page("Link wygasł", "Otwórz adres logowania jeszcze raz."))
      if (url.searchParams.get("error")) return send(res, 400, page("Anulowano", "Spotify nie udzieliło dostępu."))
      const t = await tokenRequest({ grant_type: "authorization_code", code: url.searchParams.get("code") ?? "", redirect_uri: REDIRECT_URI })
      setKv("refresh_token", t.refresh_token)
      access = { token: t.access_token, until: Date.now() + (t.expires_in - 60) * 1000 }
      await Promise.allSettled([pollNow(), pollRecent(), pollTop()])
      log("owner connected")
      return send(res, 200, page("Spotify podłączone", "Możesz zamknąć tę kartę. Strona zacznie pokazywać, czego słuchasz."))
    }

    send(res, 404, { error: "not found" })
  } catch (e) {
    log("request failed:", e.message ?? e)
    send(res, 500, { error: "internal" })
  }
})

if (!MOCK) {
  if (!CLIENT_ID || !CLIENT_SECRET || !ADMIN_KEY) log("warning: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and ADMIN_KEY must be set")
  every(NOW_EVERY, pollNow, "now")
  every(RECENT_EVERY, pollRecent, "recent")
  every(TOP_EVERY, pollTop, "top")
}
server.listen(PORT, () => log(`listening on ${PORT}${MOCK ? " (mock data)" : ""}`))
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => server.close(() => process.exit(0)))

// ---------- mock ----------

function mockFeed() {
  // invented names; only for local development
  const t = (name, artists, album, min) => ({ id: name, name, artists, album, image: null, url: null, durationMs: min * 60_000 })
  const list = [
    t("Nocny tramwaj", ["Kaskada"], "Miasto po deszczu", 3.8),
    t("Szkło i stal", ["Orbita Wschód"], "Prototyp", 4.2),
    t("Długi weekend", ["Mila Ren"], "Słońce w kadrze", 3.1),
    t("Pierwszy commit", ["Kaskada"], "Miasto po deszczu", 2.9),
    t("Północ", ["Lustro"], "Echo", 5.0),
  ]
  const at = Date.now()
  return {
    connected: true,
    updatedAt: new Date(at).toISOString(),
    now: { playing: true, progressMs: (at / 1000) % 200 * 1000, track: list[0] },
    recent: list.map((x, i) => ({ ...x, playedAt: new Date(at - (i + 1) * 13 * 60_000).toISOString() })),
    top: {
      artists: ["Kaskada", "Orbita Wschód", "Mila Ren", "Lustro", "Fala"].map((name) => ({ name, image: null, url: null, genres: [] })),
      tracks: list,
    },
    history: ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10"].map((month, i) => ({ month, plays: 380 + i * 41, minutes: 1250 + i * 130, topArtist: ["Lustro", "Kaskada", "Mila Ren", "Kaskada", "Orbita Wschód"][i] })),
    historySince: "2026-06-01T00:00:00.000Z",
  }
}
