export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 4)
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
/** 12000 -> "12 000" (pl, non-breaking space) or "12,000" (en) */
export const group = (n: number, lang: "pl" | "en" = "pl") => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, lang === "en" ? "," : "\u00a0")
/** decimal comma in Polish, point in English */
export const dec = (v: number, d: number, lang: "pl" | "en" = "pl") => (lang === "en" ? v.toFixed(d) : v.toFixed(d).replace(".", ","))

/** mulberry32: deterministic so demos look the same on every load */
export function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r())

export function pluralPoints(k: number, lang: "pl" | "en" = "pl") {
  if (lang === "en") return k === 1 ? "point" : "points"
  if (k === 1) return "punkt"
  const x = k % 10
  const y = k % 100
  return x >= 2 && x <= 4 && (y < 12 || y > 14) ? "punkty" : "punktów"
}

export const EMAIL = "me@maciejwlodarski.com"
export const LINKS = {
  github: "https://github.com/MaciejWlodarski",
  x: "https://x.com/ZireaelGG",
  burrow: "https://github.com/MaciejWlodarski/burrow",
  gwar: "https://github.com/MaciejWlodarski/gwar",
  mcpm: "https://github.com/MaciejWlodarski/mcpm",
}
