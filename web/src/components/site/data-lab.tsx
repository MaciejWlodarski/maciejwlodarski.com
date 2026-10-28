import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { PauseIcon, PlayIcon } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DAYS, DATA, SET_ORDER, avg, firstKey, keyAtOrBefore, smoothAt, correlation, fmt, insights, metricOf, niceTicks, type DataSet, type LabState, type SetKey } from "@/lib/datasets"
import { useCopy, useLang, type Lang } from "@/lib/i18n"
import { useCommand } from "@/lib/commands"
import { clamp, dec, easeOut, lerp } from "@/lib/motion"
import { scrollToSection, useSceneMode } from "@/hooks/use-scene"

type Pt = [number, number]
type Frame = { pos: Record<string, Pt>; line: [number, number, number, number] }
const M = { l: 54, r: 18, t: 22, b: 50 }

const DAYS_PER_S = 3.5
// pause on the last day before the tour changes something and the timeline restarts
const HOLD_MS = 1800
const TRAIL_DAYS = 28
const MOVE_MS = 750

type Sets = Record<SetKey, DataSet>

// every label a select can show, across all sets, so each select keeps one width
const SIZERS = Object.fromEntries(
  (Object.keys(DATA) as Lang[]).map((l) => [l, { metrics: Object.values(DATA[l]).flatMap((d) => d.metrics.map((m) => m.l)), names: Object.values(DATA[l]).flatMap((d) => d.names) }])
) as Record<Lang, { metrics: string[]; names: string[] }>

const COPY = {
  pl: {
    title: "Porównanie, które od razu coś mówi",
    lead: "Dwie osie, zakres i jeden wniosek napisany zwykłym zdaniem. Ten sam układ działa dla sprzedaży, kampanii, obsługi klienta i wszystkiego, co da się policzyć.",
    set: "Zbiór",
    sets: { shop: "Sklep", ads: "Kampanie", support: "Obsługa" },
    x: "Oś X",
    y: "Oś Y",
    range: "Średnia z",
    compare: "Porównaj",
    compareA: "Porównaj A",
    compareB: "Porównaj B",
    with: "z",
    chart: "Wykres rozrzutu. Strzałki wybierają punkt, Enter dodaje go do porównania jako B, Shift i Enter jako A.",
    day: "Dzień",
    dayOf: (d: number, n: number) => `Dzień ${d} z ${n}`,
    pause: "Wstrzymaj oś czasu",
    play: "Odtwórz oś czasu",
    avgOf: "średnia z",
    note: "Dane przykładowe, wymyślone do tego pokazu. Nazwy są fikcyjne. Liczone na żywo w przeglądarce.",
    table: "Pokaż dane jako tabelę",
    tableCaption: (range: string, d: number) => `Średnie z ${range} do dnia ${d}`,
  },
  en: {
    title: "A comparison that speaks for itself",
    lead: "Two axes, a time range and one conclusion in a plain sentence. The same layout works for sales, campaigns, customer support and anything else you can count.",
    set: "Data set",
    sets: { shop: "Shop", ads: "Campaigns", support: "Support" },
    x: "X axis",
    y: "Y axis",
    range: "Average over",
    compare: "Compare",
    compareA: "Compare A",
    compareB: "Compare B",
    with: "with",
    chart: "Scatter plot. Arrow keys pick a point, Enter adds it to the comparison as B, Shift and Enter as A.",
    day: "Day",
    dayOf: (d: number, n: number) => `Day ${d} of ${n}`,
    pause: "Pause the timeline",
    play: "Play the timeline",
    avgOf: "average over",
    note: "Sample data made up for this demo. All names are fictional. Calculated live in your browser.",
    table: "Show the data as a table",
    tableCaption: (range: string, d: number) => `Averages over ${range} up to day ${d}`,
  },
}

function initial(sets: Sets, set: SetKey): LabState {
  return { set, ...sets[set].defaults }
}

/** One step of the automatic tour: new pair, Y axis, range, X axis, then the next data set. */
function tourStep(sets: Sets, o: LabState, n: number): LabState {
  const s = sets[o.set]
  const keys = s.metrics.map((m) => m.k)
  const after = (list: string[], cur: string, skip: string) => {
    for (let k = 1; k <= list.length; k++) {
      const v = list[(list.indexOf(cur) + k) % list.length]
      if (v !== skip) return v
    }
    return cur
  }
  switch (n % 5) {
    case 0: {
      const N = s.names.length
      const A = s.names[(s.names.indexOf(o.A) + 5) % N]
      let B = s.names[(s.names.indexOf(o.B) + 7) % N]
      if (B === A) B = s.names[(s.names.indexOf(A) + 1) % N]
      return { ...o, A, B }
    }
    case 1:
      return { ...o, y: after(keys, o.y, o.x) }
    case 2:
      return { ...o, range: s.ranges[(s.ranges.indexOf(o.range) + 1) % s.ranges.length] }
    case 3:
      return { ...o, x: after(keys, o.x, o.y) }
    default:
      return initial(sets, SET_ORDER[(SET_ORDER.indexOf(o.set) + 1) % SET_ORDER.length])
  }
}

export function DataLab() {
  const { reduce } = useSceneMode()
  const lang = useLang()
  const t = useCopy(COPY)
  const sets = DATA[lang]
  const [st, setSt] = useState<LabState>(() => initial(sets, "shop"))
  // server and first paint show the last day; playback starts once the chart is in view
  const [day, setDay] = useState(DAYS)
  const [playing, setPlaying] = useState(true)
  // the tour changes the selection between passes until someone picks something
  const [tour, setTour] = useState(true)
  const [hold, setHold] = useState(false)
  const [inView, setInView] = useState(false)
  const [, setNow] = useState(0)
  const [size, setSize] = useState({ w: 700, h: 440 })
  const [hover, setHover] = useState<string | null>(null)
  const [focusIdx, setFocusIdx] = useState(-1)
  const sectionRef = useRef<HTMLElement>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const s = sets[st.set]
  const d = Math.max(day, firstKey(st.range))
  const live = playing && !reduce

  useEffect(() => {
    if (reduce) setPlaying(false)
  }, [reduce])

  useLayoutEffect(() => {
    const el = chartRef.current!
    const fit = () => {
      const w = Math.round(el.clientWidth - 12)
      if (w < 200) return
      setSize((o) => {
        const h = Math.round(clamp(w * 0.62, 300, 470))
        return o.w === w && o.h === h ? o : { w, h }
      })
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const io = new IntersectionObserver((es) => setInView(es[0].isIntersecting), { threshold: 0.35 })
    io.observe(sectionRef.current!)
    return () => io.disconnect()
  }, [])

  // axes cover the whole timeline, so they stay put while the dots travel
  const scale = useMemo(() => {
    const { w: W, h: H } = size
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    s.names.forEach((_, i) => {
      for (let e = firstKey(st.range); e <= DAYS; e++) {
        const x = avg(s, i, st.x, st.range, e)
        const y = avg(s, i, st.y, st.range, e)
        x0 = Math.min(x0, x), x1 = Math.max(x1, x), y0 = Math.min(y0, y), y1 = Math.max(y1, y)
      }
    })
    const tx = niceTicks(x0, x1, 5)
    const ty = niceTicks(y0, y1, 5)
    // rounded to 0.01 px: Node and the browser differ in the last float digit, and SVG attributes must hydrate identically
    const X = (v: number) => round2(M.l + ((v - tx[0]) / (tx[tx.length - 1] - tx[0])) * (W - M.l - M.r))
    const Y = (v: number) => round2(H - M.b - ((v - ty[0]) / (ty[ty.length - 1] - ty[0])) * (H - M.t - M.b))
    const digits = (step: number) => (step < 0.1 ? 2 : step < 1 ? 1 : 0)
    return { W, H, tx, ty, X, Y, dx: digits(tx[1] - tx[0]), dy: digits(ty[1] - ty[0]) }
  }, [s, st.x, st.y, st.range, size])
  const { W, H, X, Y } = scale

  const at = (i: number, k: string, when = d) => smoothAt(s, i, k, st.range, when)
  const xs = s.names.map((_, i) => at(i, st.x))
  const ys = s.names.map((_, i) => at(i, st.y))
  const c = correlation(xs, ys)
  const ex0 = scale.tx[0], ex1 = scale.tx[scale.tx.length - 1]
  const target: Frame = {
    pos: Object.fromEntries(s.names.map((nm, i) => [nm, [X(xs[i]), Y(ys[i])] as Pt])),
    line: [X(ex0), Y(c.my + c.slope * (ex0 - c.mx)), X(ex1), Y(c.my + c.slope * (ex1 - c.mx))],
  }

  // a new axis, range or set glides the dots over; a new set rises from the axis
  const structKey = `${st.set}|${st.x}|${st.y}|${st.range}`
  const keyRef = useRef(structKey)
  const sizeRef = useRef(size)
  const shownRef = useRef<Frame>(target)
  const move = useRef<{ from: Frame; t0: number } | null>(null)
  if (keyRef.current !== structKey) {
    const fresh = keyRef.current.split("|")[0] !== st.set
    move.current = reduce
      ? null
      : {
          from: fresh
            ? { pos: Object.fromEntries(Object.entries(target.pos).map(([nm, p]) => [nm, [W / 2 + (p[0] - W / 2) * 0.2, H - M.b] as Pt])), line: shownRef.current.line }
            : shownRef.current,
          t0: performance.now(),
        }
    keyRef.current = structKey
  }
  if (sizeRef.current !== size) {
    move.current = null
    sizeRef.current = size
  }
  let frame = target
  if (move.current) {
    const { from, t0 } = move.current
    const el = performance.now() - t0
    const pos: Record<string, Pt> = {}
    s.names.forEach((nm, i) => {
      const e = easeOut(clamp((el - i * 14) / MOVE_MS, 0, 1))
      const a = from.pos[nm] ?? target.pos[nm]
      pos[nm] = [lerp(a[0], target.pos[nm][0], e), lerp(a[1], target.pos[nm][1], e)]
    })
    const e = easeOut(clamp(el / MOVE_MS, 0, 1))
    frame = { pos, line: from.line.map((v, k) => lerp(v, target.line[k], e)) as Frame["line"] }
    if (el > MOVE_MS + s.names.length * 14) move.current = null
  }
  shownRef.current = frame

  // one loop drives the timeline, the pauses between passes and the tour
  const loop = useRef({ st, tour, hold, live, step: 0, holdUntil: 0, began: false })
  Object.assign(loop.current, { st, tour, hold, live })
  useEffect(() => {
    if (!inView) return
    let raf = 0
    let last = performance.now()
    const tick = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000)
      last = t
      const L = loop.current
      if (L.live) {
        if (!L.began) {
          L.began = true
          setDay(firstKey(L.st.range))
        } else if (L.holdUntil) {
          if (t >= L.holdUntil && !(L.tour && L.hold)) {
            L.holdUntil = 0
            const next = L.tour ? tourStep(sets, L.st, L.step++) : L.st
            if (L.tour) {
              setSt(next)
              setFocusIdx(-1)
            }
            setDay(firstKey(next.range))
          }
        } else
          setDay((v) => {
            const n = v + DAYS_PER_S * dt
            if (n < DAYS) return n
            L.holdUntil = t + HOLD_MS
            return DAYS
          })
      }
      if (move.current) setNow(t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView])

  // wraps every selection control, so picking anything ends the tour (the timeline keeps playing)
  const manual =
    <A extends unknown[]>(fn: (...a: A) => void) =>
    (...a: A) => {
      setTour(false)
      fn(...a)
    }
  const togglePlay = () => {
    if (live) return setPlaying(false)
    loop.current.holdUntil = 0
    loop.current.began = true
    if (d >= DAYS) setDay(firstKey(st.range))
    setPlaying(true)
  }
  const scrub = (v: number) => {
    setPlaying(false)
    setTour(false)
    loop.current.holdUntil = 0
    setDay(v)
  }

  const loadSet = (k: SetKey) => {
    setFocusIdx(-1)
    setSt(initial(sets, k))
  }
  useCommand("data:set", (k) => {
    scrollToSection("dane")
    setTour(false)
    if (k !== st.set) loadSet(k)
  })

  const pick = manual((nm: string, slot: "A" | "B") =>
    setSt((o) => {
      if (slot === "A") return { ...o, A: nm, B: nm === o.B ? o.A : o.B }
      if (nm === o.A) return o
      return { ...o, B: nm }
    })
  )
  const setAxis = manual((axis: "x" | "y", v: string) =>
    setSt((o) => {
      const other = axis === "x" ? "y" : "x"
      return { ...o, [axis]: v, [other]: o[other] === v ? o[axis] : o[other] }
    })
  )

  const whole = Math.round(d)
  // the sentence follows key days while playing, so it changes calmly
  const textDay = live ? keyAtOrBefore(st.range, d) : whole
  const text = useMemo(() => {
    const r = correlation(
      s.names.map((_, i) => avg(s, i, st.x, st.range, textDay)),
      s.names.map((_, i) => avg(s, i, st.y, st.range, textDay))
    ).r
    return insights(st, r, textDay, lang)
  }, [s, st, textDay, lang])

  const order = [...s.names].sort((p, q) => target.pos[p][0] - target.pos[q][0])
  const tipName = focusIdx >= 0 ? order[focusIdx] : hover
  const mx = metricOf(s, st.x)
  const my = metricOf(s, st.y)
  const ia = s.names.indexOf(st.A)
  const ib = s.names.indexOf(st.B)
  const drawOrder = [...s.names.filter((n) => n !== st.A && n !== st.B), st.B, st.A]

  // where A and B were over the last days, drawn as fading lines
  const trail = (i: number) => {
    const pts: Pt[] = []
    for (let k = TRAIL_DAYS; k >= 0; k -= 1) {
      const when = d - k
      if (when >= firstKey(st.range)) pts.push([X(at(i, st.x, when)), Y(at(i, st.y, when))])
    }
    return pts
  }
  const trails = move.current || reduce ? [] : ([[trail(ia), "stroke-primary"], [trail(ib), "stroke-compare"]] as const)

  function onKey(e: React.KeyboardEvent) {
    const n = order.length
    let next = focusIdx
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (focusIdx + 1) % n
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (focusIdx - 1 + n) % n
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = n - 1
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      if (focusIdx >= 0) pick(order[focusIdx], e.shiftKey ? "A" : "B")
      return
    } else if (e.key === "Escape") next = -1
    else return
    e.preventDefault()
    setFocusIdx(next)
  }

  const tip = tipName ? frame.pos[tipName] : null
  // svg sits inside the chart padding; tooltip coordinates are relative to the chart box
  const sr = svgRef.current?.getBoundingClientRect()
  const cr = chartRef.current?.getBoundingClientRect()
  const offX = sr && cr ? sr.left - cr.left : 6
  const offY = sr && cr ? sr.top - cr.top : 10
  const chartW = chartRef.current?.clientWidth ?? size.w

  return (
    <section ref={sectionRef} id="dane" aria-labelledby="data-h" className="bg-surface pt-[clamp(80px,9.5vw,140px)] pb-[clamp(64px,7vw,104px)]">
      <div className="wrap">
        <div data-reveal className="grid items-end gap-x-16 gap-y-6 min-[901px]:grid-cols-[1.2fr_1fr]">
          <h2 id="data-h" className="display text-[clamp(36px,5vw,72px)]">
            {t.title}
          </h2>
          <p className="max-w-[40ch] text-[clamp(19px,1.6vw,22px)] leading-[1.45]">
            {t.lead}
          </p>
        </div>

        <div data-reveal="scale" className="mt-12">
          <div
            className="rounded-scene bg-background p-[clamp(16px,2.4vw,32px)]"
            onPointerEnter={(e) => e.pointerType === "mouse" && setHold(true)}
            onPointerLeave={() => setHold(false)}
          >
            <div className="flex flex-wrap items-end gap-x-[22px] gap-y-3.5 max-sm:gap-x-3 max-sm:gap-y-2.5">
              <Ctl label={t.set}>
                <ToggleGroup spacing={0} className="seg" aria-label={t.set} value={[st.set]} onValueChange={manual(([v]: string[]) => v && v !== st.set && loadSet(v as SetKey))}>
                  <ToggleGroupItem value="shop">{t.sets.shop}</ToggleGroupItem>
                  <ToggleGroupItem value="ads">{t.sets.ads}</ToggleGroupItem>
                  <ToggleGroupItem value="support">{t.sets.support}</ToggleGroupItem>
                </ToggleGroup>
              </Ctl>
              <Ctl label={t.x}>
                <Pick value={st.x} onChange={(v) => setAxis("x", v)} items={s.metrics.map((m) => [m.k, m.l])} sizes={SIZERS[lang].metrics} label={t.x} />
              </Ctl>
              <Ctl label={t.y}>
                <Pick value={st.y} onChange={(v) => setAxis("y", v)} items={s.metrics.map((m) => [m.k, m.l])} sizes={SIZERS[lang].metrics} label={t.y} />
              </Ctl>
              <Ctl label={t.range}>
                <ToggleGroup spacing={0} className="seg" aria-label={t.range} value={[String(st.range)]} onValueChange={manual(([v]: string[]) => v && setSt((o) => ({ ...o, range: +v })))}>
                  {s.ranges.map((n) => (
                    <ToggleGroupItem key={n} value={String(n)}>
                      {s.rangeWord(n)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Ctl>
              <Ctl label={t.compare}>
                <Pick value={st.A} onChange={(v) => pick(v, "A")} items={s.names.map((n) => [n, n])} sizes={SIZERS[lang].names} label={t.compareA} tone="a" />
              </Ctl>
              <Ctl label={t.with}>
                <Pick
                  value={st.B}
                  onChange={manual((v: string) => setSt((o) => ({ ...o, B: v, A: v === o.A ? o.B : o.A })))}
                  items={s.names.map((n) => [n, n])}
                  sizes={SIZERS[lang].names}
                  label={t.compareB}
                  tone="b"
                />
              </Ctl>
            </div>

            <div className="mt-[22px] grid gap-4 *:min-w-0 min-[901px]:grid-cols-[2fr_1fr]">
              <div className="flex flex-col rounded-[18px] bg-surface">
                <div
                  ref={chartRef}
                  tabIndex={0}
                  role="group"
                  aria-label={t.chart}
                  onKeyDown={onKey}
                  onBlur={() => setFocusIdx(-1)}
                  className="relative min-h-[300px] rounded-[18px] px-1.5 pt-2.5 pb-1 focus-visible:outline-offset-2"
                >
                  <div className="flex flex-wrap justify-end gap-x-3.5 gap-y-1 px-3 pt-1 text-[13px] text-muted-foreground sm:absolute sm:top-3.5 sm:right-[18px] sm:p-0">
                    <Legend color="var(--primary)">{st.A}</Legend>
                    <Legend color="var(--compare)">{st.B}</Legend>
                    <Legend color="var(--dot)">{s.others}</Legend>
                  </div>
                  <svg ref={svgRef} aria-hidden viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="h-auto w-full overflow-visible">
                    <defs>
                      <clipPath id="plot-clip">
                        <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} />
                      </clipPath>
                    </defs>
                    {/* the day, large and faint behind the data */}
                    <text
                      x={W - M.r - 14}
                      y={H - M.b - 16}
                      className={cn("[text-anchor:end] fill-foreground/[0.07] font-heading font-bold tracking-[-0.04em] tabular-nums", W < 520 ? "text-[44px]" : "text-[76px]")}
                    >
                      {t.day} {whole}
                    </text>
                    <g className="stroke-foreground/9">
                      {scale.tx.map((v) => (
                        <g key={`x${v}`}>
                          <line x1={X(v)} x2={X(v)} y1={M.t} y2={H - M.b} />
                          <text x={X(v)} y={H - M.b + 20} className="[text-anchor:middle] fill-muted-foreground stroke-none text-xs tabular-nums">
                            {dec(v, scale.dx, lang)}
                          </text>
                        </g>
                      ))}
                      {scale.ty.map((v) => (
                        <g key={`y${v}`}>
                          <line x1={M.l} x2={W - M.r} y1={Y(v)} y2={Y(v)} />
                          <text x={M.l - 10} y={Y(v) + 4} className="[text-anchor:end] fill-muted-foreground stroke-none text-xs tabular-nums">
                            {dec(v, scale.dy, lang)}
                          </text>
                        </g>
                      ))}
                    </g>
                    <text x={W - M.r} y={H - 8} className="[text-anchor:end] fill-foreground text-[13px] font-semibold">
                      {mx.l} →
                    </text>
                    <text x={M.l} y={M.t - 8} className="fill-foreground text-[13px] font-semibold">
                      ↑ {my.l}
                    </text>
                    <path
                      clipPath="url(#plot-clip)"
                      d={`M${frame.line[0]} ${frame.line[1]}L${frame.line[2]} ${frame.line[3]}`}
                      className="fill-none stroke-muted-foreground opacity-70 [stroke-dasharray:5_5] [stroke-width:1.5]"
                    />
                    <g className="fill-none [stroke-linecap:round] [stroke-width:3]">
                      {trails.map(([pts, color]) =>
                        pts.slice(1).map((p, j) => (
                          <line key={`${color}${j}`} x1={pts[j][0]} y1={pts[j][1]} x2={p[0]} y2={p[1]} className={color} style={{ strokeOpacity: (0.6 * (j + 1)) / pts.length }} />
                        ))
                      )}
                    </g>
                    <g>
                      {drawOrder.map((nm) => {
                        const p = frame.pos[nm] ?? target.pos[nm]
                        const isA = nm === st.A, isB = nm === st.B
                        const end = target.pos[nm][0] > W - 140
                        const focused = tipName === nm && focusIdx >= 0
                        return (
                          <g
                            key={st.set + nm}
                            transform={`translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`}
                            className="group/dot cursor-pointer"
                            onPointerEnter={() => setHover(nm)}
                            onPointerLeave={() => setHover((h) => (h === nm ? null : h))}
                            onClick={(e) => pick(nm, e.shiftKey ? "A" : "B")}
                          >
                            <circle
                              r={8}
                              className={cn(
                                "stroke-surface [stroke-width:2] transition-[fill-opacity] duration-200",
                                isA ? "fill-primary" : isB ? "fill-compare" : "fill-dot [fill-opacity:0.5] group-hover/dot:[fill-opacity:0.95]",
                                focused && "[fill-opacity:0.95] stroke-foreground"
                              )}
                              style={{ fillOpacity: isA || isB ? 1 : undefined }}
                            />
                            {(isA || isB) && (
                              <text
                                x={end ? -12 : 12}
                                data-end={end || undefined}
                                y={-10}
                                className="data-end:[text-anchor:end] fill-foreground stroke-surface text-[13px] font-semibold [paint-order:stroke] [stroke-linejoin:round] [stroke-width:4px]"
                              >
                                {nm}
                              </text>
                            )}
                          </g>
                        )
                      })}
                    </g>
                  </svg>
                  <div
                    role="presentation"
                    className={cn(
                      "pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-[10px] bg-foreground px-[11px] py-2 text-[13px] leading-[1.35] whitespace-nowrap text-background shadow-[0_6px_18px_rgb(0_0_0/0.18)] transition-opacity duration-150",
                      tip ? "opacity-100" : "opacity-0"
                    )}
                    style={tip ? { left: clamp(offX + tip[0], 90, chartW - 90), top: Math.max(60, offY + tip[1]) } : undefined}
                  >
                    {tipName && (
                      <>
                        <b className="font-semibold">{tipName}</b>
                        <br />
                        {mx.l}: {fmt(mx, at(s.names.indexOf(tipName), st.x))}
                        <br />
                        {my.l}: {fmt(my, at(s.names.indexOf(tipName), st.y))}
                      </>
                    )}
                  </div>
                </div>

                {/* timeline: play through the days or drag to any of them */}
                <div className="mt-auto flex items-center gap-3 px-4 pt-1 pb-3.5">
                  <Button variant="secondary" size="icon" aria-label={live ? t.pause : t.play} onClick={togglePlay} className="size-9 flex-none rounded-full">
                    {live ? <PauseIcon /> : <PlayIcon />}
                  </Button>
                  <input
                    type="range"
                    min={firstKey(st.range)}
                    max={DAYS}
                    step={1}
                    value={whole}
                    onChange={(e) => scrub(+e.target.value)}
                    aria-label={t.day}
                    aria-valuetext={t.dayOf(whole, DAYS)}
                    className="h-1.5 min-w-0 flex-1 cursor-pointer accent-(--primary)"
                  />
                  <span className="w-[92px] flex-none text-right text-[13px] text-muted-foreground tabular-nums">
                    {t.dayOf(whole, DAYS)}
                  </span>
                </div>
              </div>

              <div aria-live={live ? "off" : "polite"} className="flex flex-col rounded-[18px] bg-surface px-[22px] pt-[22px] pb-6">
                <p className="flex flex-wrap gap-x-4 gap-y-1.5 text-[15px] font-semibold">
                  <Legend color="var(--primary)">{st.A}</Legend>
                  <Legend color="var(--compare)">{st.B}</Legend>
                </p>
                {/* fixed height, so new sentences don't push the bars around; only a changed sentence fades in */}
                <div className="min-h-[10.5rem] max-sm:min-h-0">
                  <p className="mt-4 text-[13px] text-muted-foreground tabular-nums">
                    {text[0]} · {t.avgOf} {s.rangeWord(st.range)}
                  </p>
                  <p key={text[1]} className="mt-1.5 text-[21px] leading-[1.35] font-medium tracking-[-0.01em] text-pretty motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
                    {text[1]}
                  </p>
                  <p className="mt-3 text-base text-pretty text-muted-foreground">{text[2]}</p>
                </div>
                <div className="mt-auto grid gap-[13px] pt-[22px] max-sm:pt-4">
                  {s.metrics.map((m, k) => {
                    const all = s.names.map((_, i) => at(i, m.k))
                    const lo = Math.min(...all), hi = Math.max(...all)
                    const f = (v: number) => 0.08 + (0.92 * (v - lo)) / (hi - lo || 1)
                    const va = at(ia, m.k), vb = at(ib, m.k)
                    return (
                      <div key={k} className="grid grid-cols-[1fr_auto] gap-x-2.5 gap-y-1 text-[13px]">
                        <span>{m.l}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {fmt(m, va)} · {fmt(m, vb)}
                        </span>
                        <div className="col-span-2 grid gap-[3px]">
                          <i className={cn("block h-1.5 origin-left rounded-[3px] bg-primary", !live && "transition-transform duration-700 ease-(--ease-out)")} style={{ transform: `scaleX(${f(va)})` }} />
                          <i className={cn("block h-1.5 origin-left rounded-[3px] bg-compare", !live && "transition-transform duration-700 ease-(--ease-out)")} style={{ transform: `scaleX(${f(vb)})` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-between gap-x-6 gap-y-2.5 text-sm text-muted-foreground">
              <span>{t.note}</span>
              <details className="group text-foreground">
                <summary className="cursor-pointer font-medium text-primary">{t.table}</summary>
                <div className="mt-3 max-w-full overflow-x-auto rounded-xl bg-surface">
                  <Table className="min-w-[460px] text-sm tabular-nums">
                    <TableCaption className="sr-only">
                      {t.tableCaption(s.rangeWord(st.range), whole)}
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{s.subject}</TableHead>
                        {s.metrics.map((m) => (
                          <TableHead key={m.k} className="text-right">
                            {m.l}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.names.map((nm, i) => (
                        <TableRow key={nm}>
                          <TableHead scope="row" className={cn("text-foreground", nm === st.A || nm === st.B ? "font-semibold" : "font-normal")}>
                            {nm}
                          </TableHead>
                          {s.metrics.map((m) => (
                            <TableCell key={m.k} className="text-right">
                              {fmt(m, avg(s, i, m.k, st.range, whole))}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Ctl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span aria-hidden className="pl-1 text-[13px] text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  )
}

function Legend({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  )
}

const round2 = (v: number) => Math.round(v * 100) / 100

function Pick({
  value,
  onChange,
  items,
  sizes,
  label,
  tone,
}: {
  value: string
  onChange: (v: string) => void
  items: string[][]
  sizes: string[]
  label: string
  tone?: "a" | "b"
}) {
  return (
    <Select items={Object.fromEntries(items)} value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-[38px]! rounded-full border-0 bg-muted px-3.5 text-[15px] max-sm:max-w-[46vw]",
          tone === "a" && "shadow-[inset_0_0_0_2px_var(--primary)]",
          tone === "b" && "shadow-[inset_0_0_0_2px_var(--compare)]"
        )}
      >
        {/* the longest label sits invisibly in the same cell and fixes the width */}
        <span className="grid min-w-0 text-left">
          <span className="truncate [grid-area:1/1]">
            <SelectValue />
          </span>
          {sizes.map((l) => (
            <span key={l} aria-hidden className="invisible h-0 overflow-hidden [grid-area:1/1]">
              {l}
            </span>
          ))}
        </span>
      </SelectTrigger>
      <SelectContent className="backdrop-blur-xl">
        {items.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
