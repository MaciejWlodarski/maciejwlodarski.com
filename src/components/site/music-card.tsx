import { useCallback, useEffect, useRef, useState } from "react"
import { Music2Icon } from "lucide-react"
import { cn } from "cn"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCopy, useLang, type Lang } from "@/lib/i18n"

// site-api (../site-api): polls Spotify server-side and serves one cached JSON feed
const FEED_URL =
  import.meta.env.VITE_MUSIC_FEED ?? (import.meta.env.DEV ? "http://127.0.0.1:8810/spotify/feed" : "https://api.maciejwlodarski.com/spotify/feed")
const POLL_MS = 30_000

type Track = { id: string; name: string; artists: string[]; album: string; image: string | null; url: string | null; durationMs: number }
type Play = Track & { playedAt: string }
type Artist = { name: string; image: string | null; url: string | null }
type Month = { month: string; plays: number; minutes: number; topArtist: string | null }
type Feed = {
  receivedAt: number
  connected: boolean
  updatedAt: string | null
  now: { playing: boolean; progressMs: number; track: Track } | null
  recent: Play[]
  top: { artists: Artist[]; tracks: Track[] }
  history: Month[]
}

const COPY = {
  pl: {
    title: "Czego słucham",
    source: "dane ze Spotify",
    tabs: { now: "Teraz", rec: "Ostatnie", top: "Top", his: "Historia" },
    playing: "Leci teraz",
    lastPlayed: (when: string) => `Ostatnio grane, ${when}`,
    silent: "Na razie cisza.",
    topNote: "Najczęściej z ostatnich 4 tygodni",
    noHistory: "Historia dopiero się zbiera.",
    since: (month: string) => ` muzyki od ${month}`,
    barTitle: (hours: number, artist: string) => `${hours} h, najczęściej: ${artist}`,
    down: "Spotify chwilowo niedostępne.",
    loading: "Ładuję…",
    justNow: "przed chwilą",
  },
  en: {
    title: "What I’m listening to",
    source: "via Spotify",
    tabs: { now: "Now", rec: "Recent", top: "Top", his: "History" },
    playing: "Now playing",
    lastPlayed: (when: string) => `Last played ${when}`,
    silent: "Nothing yet.",
    topNote: "Most played over the last 4 weeks",
    noHistory: "The history is still building up.",
    since: (month: string) => ` of music since ${month}`,
    barTitle: (hours: number, artist: string) => `${hours} h, most played: ${artist}`,
    down: "Spotify is unavailable right now.",
    loading: "Loading…",
    justNow: "just now",
  },
}
const TABS = ["now", "rec", "top", "his"] as const

function useFeed() {
  const [feed, setFeed] = useState<Feed | null>(null)
  const [failed, setFailed] = useState(false)
  const alive = useRef(true)
  const load = useCallback(() => {
    if (document.hidden) return
    fetch(FEED_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Feed) => alive.current && (setFeed({ ...d, receivedAt: Date.now() }), setFailed(false)))
      .catch(() => alive.current && setFailed(true))
  }, [])
  useEffect(() => {
    alive.current = true
    load()
    const id = setInterval(load, POLL_MS)
    document.addEventListener("visibilitychange", load)
    return () => {
      alive.current = false
      clearInterval(id)
      document.removeEventListener("visibilitychange", load)
    }
  }, [load])
  return { feed, failed, reload: load }
}

function ago(iso: string, lang: Lang) {
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" })
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000)
  if (min < 1) return COPY[lang].justNow
  if (min < 60) return rtf.format(-min, "minute")
  if (min < 60 * 24) return rtf.format(-Math.round(min / 60), "hour")
  return rtf.format(-Math.round(min / 1440), "day")
}
const clock = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`
// Polish: "15 czerwca" -> "czerwca", the genitive needed after "od"; English: "June"
const sinceMonth = (m: string, lang: Lang) =>
  new Date(`${m}-15`).toLocaleDateString(lang, lang === "pl" ? { day: "numeric", month: "long" } : { month: "long" }).replace(/^\d+\s*/, "")
const monthName = (m: string, lang: Lang) => new Date(`${m}-15`).toLocaleDateString(lang, { month: "short" }).replace(".", "")

// no artwork (or the mock feed): a gradient picked from the album name, so one album keeps one colour
function hue(seed: string) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

function Cover({ src, seed, round, className }: { src: string | null; seed: string; round?: boolean; className?: string }) {
  const cls = cn("shrink-0 overflow-hidden", round ? "rounded-full" : "rounded-[10px]", className)
  if (src) return <img src={src} alt="" loading="lazy" className={cn(cls, "bg-muted object-cover")} />
  const h = hue(seed)
  return (
    <span
      aria-hidden
      className={cn(cls, "grid place-items-center text-white/80")}
      style={{ background: `linear-gradient(140deg, hsl(${h} 70% 62%), hsl(${(h + 48) % 360} 62% 42%))` }}
    >
      <Music2Icon className="size-[38%] max-w-10" strokeWidth={1.75} />
    </span>
  )
}

/** three bars that bounce while something plays */
function Equalizer() {
  return (
    <span aria-hidden className="eq inline-flex h-3 items-end gap-[2px]">
      <i />
      <i />
      <i />
    </span>
  )
}

function Linked({ url, children }: { url: string | null; children: React.ReactNode }) {
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="hover:underline">
      {children}
    </a>
  ) : (
    <>{children}</>
  )
}

function Row({ track, side }: { track: Track; side?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <Cover src={track.image} seed={track.album} className="size-10" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] leading-tight font-semibold">
          <Linked url={track.url}>{track.name}</Linked>
        </p>
        <p className="truncate text-sm leading-tight text-muted-foreground">{track.artists.join(", ")}</p>
      </div>
      {side && <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{side}</span>}
    </li>
  )
}

function NowPlaying({ feed, onEnded }: { feed: Feed; onEnded: () => void }) {
  const lang = useLang()
  const t = COPY[lang]
  const now = feed.now
  const playing = !!now?.playing
  const track = playing ? now!.track : feed.recent[0]
  const [, tick] = useState(0)
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [playing])

  // progress ticks locally from the moment this feed arrived; at the end of a track ask for the next one
  const pos = playing ? Math.min(now!.track.durationMs, now!.progressMs + (Date.now() - feed.receivedAt)) : 0
  const ended = playing && pos >= now!.track.durationMs
  useEffect(() => {
    if (!ended) return
    const id = setTimeout(onEnded, 1500)
    return () => clearTimeout(id)
  }, [ended, onEnded])

  if (!track) return <Empty>{t.silent}</Empty>
  return (
    <div className="flex h-full gap-4 sm:gap-5">
      <div className="relative shrink-0 self-start">
        {/* the cover's own colour as a soft glow underneath */}
        <Cover src={track.image} seed={track.album} className="absolute inset-0 size-full scale-90 opacity-50 blur-xl saturate-150" />
        <Cover src={track.image} seed={track.album} className="relative size-28 rounded-[14px] shadow-[0_1px_2px_rgb(0_0_0/0.12)] sm:size-[11.5rem]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {playing ? (
            <>
              <Equalizer /> {t.playing}
            </>
          ) : (
            <>{t.lastPlayed(ago((track as Play).playedAt, lang))}</>
          )}
        </p>
        <p className="mt-2 line-clamp-2 text-[22px] leading-[1.15] font-semibold tracking-[-0.015em] text-balance">
          <Linked url={track.url}>{track.name}</Linked>
        </p>
        <p className="mt-1 truncate text-[15px]">{track.artists.join(", ")}</p>
        <p className="truncate text-[15px] text-muted-foreground">{track.album}</p>
        {playing && (
          <div className="mt-auto pt-3">
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground transition-[width] duration-1000 ease-linear" style={{ width: `${(pos / now!.track.durationMs) * 100}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{clock(pos)}</span>
              <span>-{clock(now!.track.durationMs - pos)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function History({ months }: { months: Month[] }) {
  const lang = useLang()
  const t = COPY[lang]
  if (!months.length) return <Empty>{t.noHistory}</Empty>
  const max = Math.max(...months.map((m) => m.minutes), 1)
  const total = months.reduce((s, m) => s + m.minutes, 0)
  return (
    <div className="flex h-full flex-col">
      <p className="text-[15px] text-muted-foreground">
        <span className="font-semibold text-foreground">{Math.round(total / 60)} h</span>
        {t.since(sinceMonth(months[0].month, lang))}
      </p>
      <div className="mt-auto flex h-[6.5rem] items-end gap-2 sm:gap-3">
        {months.map((m, i) => (
          <div key={m.month} className="group relative flex h-full flex-1 flex-col justify-end" title={t.barTitle(Math.round(m.minutes / 60), m.topArtist ?? "—")}>
            <span className="absolute inset-x-0 -top-5 text-center text-xs text-muted-foreground tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
              {Math.round(m.minutes / 60)} h
            </span>
            <div
              className={cn("rounded-[6px] transition-colors", i === months.length - 1 ? "bg-primary" : "bg-primary/22 group-hover:bg-primary/40")}
              style={{ height: `${Math.max(6, (m.minutes / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-center sm:gap-3 text-xs text-muted-foreground">
        {months.map((m, i) => (
          <span key={m.month} className={cn("flex-1", i === months.length - 1 && "font-semibold text-foreground")}>
            {monthName(m.month, lang)}
          </span>
        ))}
      </div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] text-muted-foreground">{children}</p>
}

export function MusicCard({ className }: { className?: string }) {
  const lang = useLang()
  const t = useCopy(COPY)
  const { feed, failed, reload } = useFeed()
  const live = feed?.connected

  return (
    <div className={cn("rounded-[18px] bg-surface px-[22px] pt-[22px] pb-6", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 id="music-h" className="text-[19px] font-semibold">
          {t.title}
        </h3>
        {live && (
          <a href="https://open.spotify.com" target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
            {t.source}
          </a>
        )}
      </div>
      <Tabs defaultValue="now" className="mt-3.5 gap-0">
        <TabsList aria-labelledby="music-h" className="h-auto rounded-full bg-muted p-[3px]">
          {TABS.map((v) => (
            <TabsTrigger key={v} value={v} className="h-8 rounded-full px-3.5 text-sm data-active:bg-surface">
              {t.tabs[v]}
            </TabsTrigger>
          ))}
        </TabsList>
        {/* fixed height: switching tabs or a new poll never moves the page below */}
        <div className="mt-5 h-[11.5rem] text-base [&>[role=tabpanel]]:h-full">
          {!live ? (
            <Empty>{failed || feed ? t.down : t.loading}</Empty>
          ) : (
            <>
              <TabsContent value="now">
                <NowPlaying feed={feed} onEnded={reload} />
              </TabsContent>
              <TabsContent value="rec">
                <ul className="grid gap-2">
                  {feed.recent.slice(0, 4).map((p) => (
                    <Row key={p.playedAt} track={p} side={ago(p.playedAt, lang)} />
                  ))}
                </ul>
              </TabsContent>
              <TabsContent value="top">
                <p className="text-[15px] text-muted-foreground">{t.topNote}</p>
                <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  {feed.top.artists.slice(0, 6).map((a, i) => (
                    <li key={a.name} className="flex min-w-0 items-center gap-3">
                      <span className="w-3 text-sm text-muted-foreground tabular-nums">{i + 1}</span>
                      <Cover src={a.image} seed={a.name} round className="size-10" />
                      <span className="truncate text-[15px] font-semibold">
                        <Linked url={a.url}>{a.name}</Linked>
                      </span>
                    </li>
                  ))}
                </ol>
              </TabsContent>
              <TabsContent value="his">
                <History months={feed.history} />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  )
}
