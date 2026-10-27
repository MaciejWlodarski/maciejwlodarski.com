import type { Lang } from "@/lib/i18n"
import { clamp, dec, gauss, rng } from "@/lib/motion"

/* Invented sample data for the comparison demo. Names are fictional. */

export type Metric = { k: string; l: string; d: number; u?: string; hi: string; lo: string; ins: string; worse?: boolean; lang: Lang }
export type SetKey = "shop" | "ads" | "support"
export type DataSet = {
  lang: Lang
  ranges: [number, number, number]
  rangeWord: (n: number) => string
  rangeLoc: (n: number, end: number) => string
  subject: string
  others: string
  names: string[]
  metrics: Metric[]
  defaults: { x: string; y: string; A: string; B: string; range: number }
  series: Record<string, number>[][]
}

type Gen = (r: () => number, e: Record<string, number>, j: number, n: number) => Record<string, number>

function makeSeries(count: number, n: number, seed: number, entity: (r: () => number) => Record<string, number>, gen: Gen) {
  const r = rng(seed)
  const ents: Record<string, number>[] = []
  return Array.from({ length: count }, (_, i) => {
    const out: Record<string, number>[] = []
    for (let j = 0; j < n; j++) {
      const e = ents[i] ?? (ents[i] = entity(r))
      out.push(gen(r, e, j, n))
    }
    return out
  })
}

// every set covers the same 90 days; the chart plays through them
export const DAYS = 90

// order of the automatic tour
export const SET_ORDER: SetKey[] = ["shop", "ads", "support"]

/*
 * The numbers are shared; only the words differ per language. Names are listed
 * in the same order in both languages, so index i is the same item everywhere.
 */
type MetricBase = { k: string; d: number; money?: boolean; u?: string; worse?: boolean }
type MetricWords = { l: string; hi: string; lo: string; ins: string }
type SetBase = { metrics: MetricBase[]; x: string; y: string; A: number; B: number; series: Record<string, number>[][] }
type SetWords = { subject: string; others: string; names: string[]; metrics: Record<string, MetricWords> }

const BASE: Record<SetKey, SetBase> = {
  shop: {
    metrics: [{ k: "sales", d: 1 }, { k: "margin", d: 1, u: "%" }, { k: "returns", d: 1, u: "%", worse: true }, { k: "rating", d: 2 }],
    x: "rating",
    y: "returns",
    A: 2,
    B: 3,
    series: makeSeries(
      16,
      90,
      58,
      (r) => ({ q: gauss(r), p: r(), t: r() * 2 - 1, m: 18 + r() * 30, u: gauss(r), v: gauss(r) }),
      (r, e, j, n) => {
        const form = e.t * (j / (n - 1) - 0.5) * 1.8
        return {
          sales: Math.max(0, (6 + 22 * e.p) * (1 + 0.35 * form) + 4 * gauss(r)),
          margin: e.m + 6 * form + 2 * gauss(r),
          returns: Math.max(0.2, 6 - 1.6 * e.q + 1.3 * e.u + 1.8 * gauss(r) - 2.6 * form),
          rating: clamp(4.2 + 0.3 * e.q + 0.16 * e.v + 0.3 * form + 0.25 * gauss(r), 1, 5),
        }
      }
    ),
  },
  ads: {
    metrics: [{ k: "spend", d: 0, money: true }, { k: "ctr", d: 2, u: "%" }, { k: "cr", d: 1, u: "%" }, { k: "cpa", d: 0, money: true, worse: true }],
    x: "cr",
    y: "cpa",
    A: 0,
    B: 1,
    series: makeSeries(
      16,
      90,
      73,
      (r) => ({ q: gauss(r), p: r(), t: r() * 2 - 1, v: gauss(r) }),
      (r, e, j, n) => {
        const form = e.t * (j / (n - 1) - 0.5) * 1.6
        const cr = clamp(2.4 + 0.9 * e.q - 0.5 * (e.p - 0.5) + 1.1 * form + 0.6 * gauss(r), 0.2, 9)
        return {
          spend: Math.max(40, (200 + 1600 * e.p) * (1 + 0.2 * form) + 90 * gauss(r)),
          ctr: clamp(1.5 + 0.45 * e.q + 0.35 * e.v + 0.6 * form + 0.4 * gauss(r), 0.1, 6),
          cr,
          cpa: clamp(110 / cr + 12 * e.p + 5 * gauss(r), 6, 160),
        }
      }
    ),
  },
  support: {
    metrics: [{ k: "first", d: 1, u: " min", worse: true }, { k: "csat", d: 2 }, { k: "tickets", d: 1 }, { k: "fcr", d: 1, u: "%" }],
    x: "first",
    y: "csat",
    A: 0,
    B: 1,
    series: makeSeries(
      16,
      90,
      29,
      (r) => ({ q: gauss(r), p: r(), t: r() * 2 - 1, l: gauss(r) }),
      (r, e, j, n) => {
        const form = e.t * (j / (n - 1) - 0.5) * 1.6
        const first = Math.max(1, 9 + 3 * e.l - 2 * e.q - 4.5 * form + 3 * gauss(r))
        return {
          first,
          csat: clamp(4.75 - 0.05 * first + 0.15 * e.q + 0.2 * gauss(r), 1, 5),
          tickets: Math.max(2, (12 + 12 * e.p) * (1 + 0.2 * form) + 3 * gauss(r)),
          fcr: clamp(70 + 7 * e.q - 3 * e.l + 9 * form + 7 * gauss(r), 20, 99),
        }
      }
    ),
  },
}

const SUPPORT_NAMES = ["Ola", "Kuba", "Zosia", "Bartek", "Nina", "Igor", "Maja", "Tymon", "Lena", "Adam", "Ewa", "Filip", "Hania", "Olek", "Iga", "Staś"]

const WORDS: Record<Lang, Record<SetKey, SetWords>> = {
  pl: {
    shop: {
      subject: "Produkt",
      others: "pozostałe",
      names: ["Lampa", "Kubek", "Plecak", "Słuchawki", "Notes A5", "Torba", "Ramka", "Głośnik", "Organizer", "Butelka", "Poduszka", "Zegar", "Świeca", "Puzzle", "Kalendarz", "Brelok"],
      metrics: {
        sales: { l: "Sprzedaż dziennie", hi: "większą sprzedaż", lo: "mniejszą sprzedaż", ins: "sprzedażą" },
        margin: { l: "Marża", hi: "wyższą marżę", lo: "niższą marżę", ins: "marżą" },
        returns: { l: "Zwroty", hi: "więcej zwrotów", lo: "mniej zwrotów", ins: "zwrotami" },
        rating: { l: "Ocena", hi: "wyższą ocenę", lo: "niższą ocenę", ins: "oceną" },
      },
    },
    ads: {
      subject: "Kampania",
      others: "pozostałe",
      names: ["Remarketing", "Wideo 15 s", "Newsletter", "Wyszukiwarka", "Karuzela", "Influencer", "Podcast", "Banery", "Kod rabatowy", "Polecenia", "Konkurs", "Webinar", "Koszyk", "Lookalike", "Sezonowa", "Marka"],
      metrics: {
        spend: { l: "Budżet dzienny", hi: "większy budżet", lo: "mniejszy budżet", ins: "budżetem" },
        ctr: { l: "CTR", hi: "wyższy CTR", lo: "niższy CTR", ins: "CTR" },
        cr: { l: "Konwersja", hi: "wyższą konwersję", lo: "niższą konwersję", ins: "konwersją" },
        cpa: { l: "Koszt pozyskania", hi: "wyższy koszt pozyskania", lo: "niższy koszt pozyskania", ins: "kosztem pozyskania" },
      },
    },
    support: {
      subject: "Konsultant",
      others: "pozostali",
      names: SUPPORT_NAMES,
      metrics: {
        first: { l: "Czas odpowiedzi", hi: "dłuższy czas odpowiedzi", lo: "krótszy czas odpowiedzi", ins: "czasem odpowiedzi" },
        csat: { l: "Ocena klienta", hi: "wyższą ocenę klientów", lo: "niższą ocenę klientów", ins: "oceną klientów" },
        tickets: { l: "Zgłoszenia dziennie", hi: "więcej zgłoszeń", lo: "mniej zgłoszeń", ins: "liczbą zgłoszeń" },
        fcr: { l: "Od razu rozwiązane", hi: "więcej spraw rozwiązanych od razu", lo: "mniej spraw rozwiązanych od razu", ins: "sprawami rozwiązanymi od razu" },
      },
    },
  },
  en: {
    shop: {
      subject: "Product",
      others: "others",
      names: ["Lamp", "Mug", "Backpack", "Headphones", "A5 notebook", "Bag", "Frame", "Speaker", "Organizer", "Bottle", "Cushion", "Clock", "Candle", "Puzzle", "Calendar", "Keyring"],
      metrics: {
        sales: { l: "Daily sales", hi: "higher sales", lo: "lower sales", ins: "sales" },
        margin: { l: "Margin", hi: "a higher margin", lo: "a lower margin", ins: "margin" },
        returns: { l: "Returns", hi: "more returns", lo: "fewer returns", ins: "returns" },
        rating: { l: "Rating", hi: "a higher rating", lo: "a lower rating", ins: "rating" },
      },
    },
    ads: {
      subject: "Campaign",
      others: "others",
      names: ["Remarketing", "15s video", "Newsletter", "Search", "Carousel", "Influencer", "Podcast", "Banners", "Discount code", "Referrals", "Contest", "Webinar", "Cart", "Lookalike", "Seasonal", "Brand"],
      metrics: {
        spend: { l: "Daily budget", hi: "a larger budget", lo: "a smaller budget", ins: "budget" },
        ctr: { l: "CTR", hi: "a higher CTR", lo: "a lower CTR", ins: "CTR" },
        cr: { l: "Conversion", hi: "a higher conversion rate", lo: "a lower conversion rate", ins: "conversion rate" },
        cpa: { l: "Acquisition cost", hi: "a higher acquisition cost", lo: "a lower acquisition cost", ins: "acquisition cost" },
      },
    },
    support: {
      subject: "Agent",
      others: "others",
      names: SUPPORT_NAMES,
      metrics: {
        first: { l: "Response time", hi: "a longer response time", lo: "a shorter response time", ins: "response time" },
        csat: { l: "Customer rating", hi: "a higher customer rating", lo: "a lower customer rating", ins: "customer rating" },
        tickets: { l: "Daily tickets", hi: "more tickets", lo: "fewer tickets", ins: "ticket volume" },
        fcr: { l: "Resolved at once", hi: "more cases resolved at once", lo: "fewer cases resolved at once", ins: "cases resolved at once" },
      },
    },
  },
}

const RANGE_WORD: Record<Lang, (n: number) => string> = { pl: (n) => `${n}\u00a0dni`, en: (n) => `${n}\u00a0days` }
const WINDOW: Record<Lang, (n: number, end: number) => string> = {
  pl: (n, end) => (end >= DAYS ? `Ostatnie ${n} dni` : `Dni ${end - n + 1}–${end}`),
  en: (n, end) => (end >= DAYS ? `Last ${n} days` : `Days ${end - n + 1}–${end}`),
}

function build(lang: Lang, key: SetKey): DataSet {
  const b = BASE[key]
  const w = WORDS[lang][key]
  return {
    lang,
    ranges: [7, 14, 30],
    rangeWord: RANGE_WORD[lang],
    rangeLoc: WINDOW[lang],
    subject: w.subject,
    others: w.others,
    names: w.names,
    metrics: b.metrics.map((m) => ({ k: m.k, d: m.d, worse: m.worse, lang, u: m.money ? (lang === "en" ? "\u00a0PLN" : "\u00a0zł") : m.u?.replace(" ", "\u00a0"), ...w.metrics[m.k] })),
    defaults: { x: b.x, y: b.y, A: w.names[b.A], B: w.names[b.B], range: 14 },
    series: b.series,
  }
}

export const DATA: Record<Lang, Record<SetKey, DataSet>> = {
  pl: { shop: build("pl", "shop"), ads: build("pl", "ads"), support: build("pl", "support") },
  en: { shop: build("en", "shop"), ads: build("en", "ads"), support: build("en", "support") },
}

export type LabState = { set: SetKey; x: string; y: string; A: string; B: string; range: number }

export const metricOf = (s: DataSet, k: string) => s.metrics.find((m) => m.k === k)!
export const fmt = (m: Metric, v: number) => dec(v, m.d, m.lang) + (m.u ?? "")

// running sums per metric, so a window average costs two lookups at any day
const sums = new WeakMap<DataSet["series"], Map<string, Float64Array[]>>()
function prefix(s: DataSet, k: string) {
  let bySet = sums.get(s.series)
  if (!bySet) sums.set(s.series, (bySet = new Map()))
  let rows = bySet.get(k)
  if (!rows) {
    rows = s.series.map((row) => {
      const p = new Float64Array(row.length + 1)
      row.forEach((d, j) => (p[j + 1] = p[j] + d[k]))
      return p
    })
    bySet.set(k, rows)
  }
  return rows
}

/** Average of the `range` days that end on day `end` (1-based, inclusive). */
export function avg(s: DataSet, i: number, k: string, range: number, end = DAYS) {
  const p = prefix(s, k)[i]
  return (p[end] - p[end - range]) / range
}

/*
 * Playback passes through key days, every KEY_STEP days counted back from the
 * last one, and glides between them on a Catmull-Rom curve. Day-to-day noise
 * would otherwise make the dots jitter.
 */
export const KEY_STEP = 6
export const firstKey = (range: number) => DAYS - Math.floor((DAYS - range) / KEY_STEP) * KEY_STEP
/** Latest key day at or before `day`. */
export const keyAtOrBefore = (range: number, day: number) => Math.max(firstKey(range), DAYS - Math.ceil((DAYS - day) / KEY_STEP) * KEY_STEP)

export function smoothAt(s: DataSet, i: number, k: string, range: number, day: number) {
  const k0 = firstKey(range)
  const t = clamp((day - k0) / KEY_STEP, 0, (DAYS - k0) / KEY_STEP)
  const j = Math.min(Math.floor(t), (DAYS - k0) / KEY_STEP - 1)
  const f = t - j
  const v = (n: number) => avg(s, i, k, range, clamp(k0 + n * KEY_STEP, k0, DAYS))
  if (j < 0) return v(0)
  const p0 = v(j - 1), p1 = v(j), p2 = v(j + 1), p3 = v(j + 2)
  return 0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f * f * f)
}

export function niceTicks(lo: number, hi: number, count: number) {
  const span = hi - lo || 1
  let step = Math.pow(10, Math.floor(Math.log10(span / count)))
  const err = span / count / step
  if (err >= 7.5) step *= 10
  else if (err >= 3.5) step *= 5
  else if (err >= 1.5) step *= 2
  const a = Math.floor(lo / step) * step
  const b = Math.ceil(hi / step) * step
  const t: number[] = []
  for (let v = a; v <= b + step / 2; v += step) t.push(+v.toFixed(6))
  return t
}

export function correlation(xs: number[], ys: number[]) {
  const n = xs.length
  const mx = xs.reduce((p, c) => p + c, 0) / n
  const my = ys.reduce((p, c) => p + c, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my)
    sxx += (xs[i] - mx) ** 2
    syy += (ys[i] - my) ** 2
  }
  return { mx, my, slope: sxy / (sxx || 1), r: sxy / (Math.sqrt(sxx * syy) || 1) }
}

const SAY = {
  pl: {
    pickTwo: "Wybierz dwie różne pozycje, żeby je porównać.",
    equal: (a: string, b: string, metric: string, value: string) => `${a} i ${b} wypadają tak samo: ${metric.toLowerCase()} ${value}.`,
    compare: (a: string, b: string, what: string) => `${a} ma ${what} niż ${b}`,
    but: (what: string) => `, ale ${what}.`,
    // only "not worse elsewhere": other metrics may tie after rounding
    rest: (better: boolean) => `, a w żadnej innej mierze nie wypada ${better ? "gorzej" : "lepiej"}.`,
    strength: ["silna", "wyraźna", "słaba", "prawie żadna"],
    sign: (pos: boolean) => (pos ? ", dodatnia" : ", ujemna"),
    sameAxis: "Ta sama miara na obu osiach: wybierz inną oś, żeby zobaczyć zależność.",
    trend: (x: string, y: string, how: string, r: string) => `Zależność między ${x} a ${y}: ${how}, r\u00a0=\u00a0${r}.`,
  },
  en: {
    pickTwo: "Pick two different items to compare them.",
    equal: (a: string, b: string, metric: string, value: string) => `${a} and ${b} are level on ${metric.toLowerCase()}: ${value}.`,
    compare: (a: string, b: string, what: string) => `${a} has ${what} than ${b}`,
    but: (what: string) => `, but ${what}.`,
    rest: (better: boolean) => ` and is no ${better ? "worse" : "better"} on any other metric.`,
    strength: ["strong", "clear", "weak", "almost none"],
    sign: (pos: boolean) => (pos ? ", positive" : ", negative"),
    sameAxis: "Both axes show the same metric. Pick another one to see a relationship.",
    trend: (x: string, y: string, how: string, r: string) => `Relationship between ${x} and ${y}: ${how}, r\u00a0=\u00a0${r}.`,
  },
} satisfies Record<Lang, unknown>

/** Period caption, the A vs B sentence and the overall trend, for the window ending on day `end`. */
export function insights(st: LabState, r: number, end = DAYS, lang: Lang = "pl"): [string, string, string] {
  const s = DATA[lang][st.set]
  const say = SAY[lang]
  const ia = s.names.indexOf(st.A)
  const ib = s.names.indexOf(st.B)
  const my = metricOf(s, st.y)
  const mx = metricOf(s, st.x)
  let main: string
  if (ia === ib) main = say.pickTwo
  else {
    const va = avg(s, ia, st.y, st.range, end)
    const vb = avg(s, ib, st.y, st.range, end)
    const same = fmt(my, va) === fmt(my, vb)
    const better = (m: Metric, x: number, y: number) => (m.worse ? x < y : x > y)
    const aBetter = better(my, va, vb)
    let other: [Metric, boolean] | null = null
    if (!same)
      for (const m of s.metrics) {
        if (m.k === st.y) continue
        const x = avg(s, ia, m.k, st.range, end)
        const y = avg(s, ib, m.k, st.range, end)
        if (fmt(m, x) !== fmt(m, y) && better(m, x, y) !== aBetter) {
          other = [m, x > y]
          break
        }
      }
    // no numbers in the comparison: the bars below carry them, and the sentence stays short
    if (same) main = say.equal(st.A, st.B, my.l, fmt(my, va))
    else {
      main = say.compare(st.A, st.B, va > vb ? my.hi : my.lo)
      main += other ? say.but(other[1] ? other[0].hi : other[0].lo) : say.rest(aBetter)
    }
  }
  const ac = Math.abs(r)
  const how = say.strength[ac >= 0.7 ? 0 : ac >= 0.4 ? 1 : ac >= 0.2 ? 2 : 3] + (ac >= 0.2 ? say.sign(r > 0) : "")
  const trend = st.x === st.y ? say.sameAxis : say.trend(mx.ins, my.ins, how, dec(r, 2, lang).replace("-", "−"))
  return [s.rangeLoc(st.range, end), main, trend]
}
