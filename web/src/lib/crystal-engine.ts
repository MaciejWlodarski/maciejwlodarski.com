import { clamp, ease, easeOut, lerp, rng, smooth } from "@/lib/motion"

/*
 * Canvas 2D point cloud: a shape (model) bursts into a cloud and settles
 * inside a glass block with a margin from the walls. `a` runs 0..1:
 * 0 model, 0.5 points, 1 crystal. Rendering batches points into luminance
 * buckets so each frame costs one fillStyle per bucket.
 */

export type Form = "knot" | "text" | "relief" | "photo"
export type Block = "cube" | "tall" | "wide"
export const BLOCKS: Record<Block, [number, number, number]> = {
  cube: [60, 60, 60],
  tall: [50, 80, 50],
  wide: [80, 50, 50],
}
export const DENSITY = [3000, 6000, 10000, 15000, 22000]
export const DENSITY_WORDS = ["rzadko", "luźno", "średnio", "gęsto", "bardzo gęsto"]
export const stageOf = (v: number) => (v < 0.25 ? 0 : v < 0.75 ? 1 : 2)
const STAGE_BAND = 0.06

type Shape = { P: Float32Array; N: Float32Array; half: [number, number, number] }
type Photo = { L: Float32Array; w: number; h: number }

function finish(P: Float32Array, Nn: Float32Array, n: number): Shape {
  const mn = [1e9, 1e9, 1e9]
  const mx = [-1e9, -1e9, -1e9]
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 3; k++) {
      const v = P[i * 3 + k]
      if (v < mn[k]) mn[k] = v
      if (v > mx[k]) mx[k] = v
    }
  const c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2]
  const h = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) / 2 || 1
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] = (P[i * 3 + k] - c[k]) / h
  return { P, N: Nn, half: [(mx[0] - mn[0]) / 2 / h, (mx[1] - mn[1]) / 2 / h, (mx[2] - mn[2]) / 2 / h] }
}

function knot(n: number): Shape {
  const P = new Float32Array(n * 3)
  const Nn = new Float32Array(n * 3)
  const r = rng(11)
  const e = 1e-3
  const c = (u: number) => {
    const rr = 2 + Math.cos(3 * u)
    return [rr * Math.cos(2 * u), rr * Math.sin(2 * u), -Math.sin(3 * u) * 1.2]
  }
  for (let i = 0; i < n; i++) {
    const u = r() * Math.PI * 2
    const v = r() * Math.PI * 2
    const p0 = c(u), p1 = c(u + e), pm = c(u - e)
    let T = [p1[0] - pm[0], p1[1] - pm[1], p1[2] - pm[2]]
    const tl = Math.hypot(T[0], T[1], T[2])
    T = [T[0] / tl, T[1] / tl, T[2] / tl]
    let K = [p1[0] + pm[0] - 2 * p0[0], p1[1] + pm[1] - 2 * p0[1], p1[2] + pm[2] - 2 * p0[2]]
    const kd = K[0] * T[0] + K[1] * T[1] + K[2] * T[2]
    K = [K[0] - kd * T[0], K[1] - kd * T[1], K[2] - kd * T[2]]
    const kl = Math.hypot(K[0], K[1], K[2]) || 1
    K = [K[0] / kl, K[1] / kl, K[2] / kl]
    const B = [T[1] * K[2] - T[2] * K[1], T[2] * K[0] - T[0] * K[2], T[0] * K[1] - T[1] * K[0]]
    const cv = Math.cos(v), sv = Math.sin(v), rad = 0.62
    const nx = cv * K[0] + sv * B[0], ny = cv * K[1] + sv * B[1], nz = cv * K[2] + sv * B[2]
    P[i * 3] = p0[0] + rad * nx
    P[i * 3 + 1] = p0[2] * 0.9 + rad * nz
    P[i * 3 + 2] = p0[1] + rad * ny
    Nn[i * 3] = nx
    Nn[i * 3 + 1] = nz
    Nn[i * 3 + 2] = ny
  }
  return finish(P, Nn, n)
}

function textShape(n: number, txt: string, fam: string): Shape | null {
  const W = 720, H = 220
  const off = document.createElement("canvas")
  off.width = W
  off.height = H
  const o = off.getContext("2d")!
  let size = 190
  o.font = `700 ${size}px ${fam}`
  const tw = o.measureText(txt).width || 1
  size = Math.min(size, (size * (W * 0.94)) / tw)
  o.font = `700 ${size}px ${fam}`
  o.textAlign = "center"
  o.textBaseline = "middle"
  o.fillText(txt, W / 2, H / 2)
  const d = o.getImageData(0, 0, W, H).data
  const fill: number[] = [], edge: number[] = []
  const A = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : d[(y * W + x) * 4 + 3])
  for (let y = 0; y < H; y += 2)
    for (let x = 0; x < W; x += 2) {
      if (A(x, y) > 128) {
        fill.push(x, y)
        if (A(x - 2, y) < 128 || A(x + 2, y) < 128 || A(x, y - 2) < 128 || A(x, y + 2) < 128) edge.push(x, y)
      }
    }
  if (!fill.length) return null
  const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3)
  const r = rng(5 + txt.length * 7), depth = 34
  for (let i = 0; i < n; i++) {
    let px: number, py: number, pz: number, nx = 0, ny = 0, nz: number
    if (r() < 0.7 || !edge.length) {
      const j = Math.floor((r() * fill.length) / 2) * 2
      px = fill[j] + (r() - 0.5) * 2
      py = fill[j + 1] + (r() - 0.5) * 2
      nz = r() < 0.5 ? 1 : -1
      pz = nz * depth
    } else {
      const q = Math.floor((r() * edge.length) / 2) * 2, ex = edge[q], ey = edge[q + 1]
      px = ex + (r() - 0.5) * 2
      py = ey + (r() - 0.5) * 2
      pz = (r() * 2 - 1) * depth
      nx = A(ex - 2, ey) - A(ex + 2, ey)
      ny = -(A(ex, ey - 2) - A(ex, ey + 2))
      const l = Math.hypot(nx, ny) || 1
      nx /= l
      ny /= l
      nz = 0
    }
    P[i * 3] = px
    P[i * 3 + 1] = -py
    P[i * 3 + 2] = pz
    Nn[i * 3] = nx
    Nn[i * 3 + 1] = ny
    Nn[i * 3 + 2] = nz
  }
  return finish(P, Nn, n)
}

function relief(n: number, hf: (x: number, y: number) => number, wf: ((x: number, y: number) => number) | null, aspect: number): Shape {
  const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3)
  const r = rng(23), e = 0.01, H = 0.42
  let i = 0, guard = 0
  while (i < n && guard++ < n * 40) {
    const x = r() * 2 - 1, y = (r() * 2 - 1) * aspect
    if (wf && r() > wf(x, y)) continue
    const h = hf(x, y)
    const gx = ((hf(x + e, y) - hf(x - e, y)) / (2 * e)) * H
    const gy = ((hf(x, y + e) - hf(x, y - e)) / (2 * e)) * H
    const l = Math.hypot(gx, gy, 1)
    P[i * 3] = x
    P[i * 3 + 1] = y
    P[i * 3 + 2] = h * H
    Nn[i * 3] = -gx / l
    Nn[i * 3 + 1] = -gy / l
    Nn[i * 3 + 2] = 1 / l
    i++
  }
  for (; i < n; i++) {
    P[i * 3] = P[0]
    P[i * 3 + 1] = P[1]
    P[i * 3 + 2] = P[2]
    Nn[i * 3 + 2] = 1
  }
  return finish(P, Nn, n)
}

function terrain(x: number, y: number) {
  const g = (cx: number, cy: number, s: number, h: number) => h * Math.exp(-((x - cx) * (x - cx) + (y - cy) * (y - cy)) / s)
  const rr = Math.hypot(x + 0.1, y - 0.05)
  return g(-0.32, 0.12, 0.16, 0.95) + g(0.42, -0.22, 0.09, 0.7) + g(0.15, 0.42, 0.05, 0.45) + 0.07 * Math.sin(rr * 16) * Math.exp(-rr * 1.2)
}

function photoShape(n: number, photo: Photo): Shape {
  const { L, w, h } = photo
  const asp = h / w
  const at = (x: number, y: number) => {
    const px = clamp(Math.round(((x + 1) / 2) * (w - 1)), 0, w - 1)
    const py = clamp(Math.round((1 - (y / asp + 1) / 2) * (h - 1)), 0, h - 1)
    return L[py * w + px]
  }
  return relief(n, (x, y) => at(x, y) * 1.1, (x, y) => 0.08 + 0.92 * Math.pow(at(x, y), 1.4), asp)
}

/** Reads an image file into a normalised luminance grid. Never leaves the browser. */
export function loadPhoto(file: File): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      let w = 120
      let h = Math.max(24, Math.round((w * img.naturalHeight) / img.naturalWidth))
      if (h > 160) {
        h = 160
        w = Math.round((h * img.naturalWidth) / img.naturalHeight)
      }
      const o = document.createElement("canvas")
      o.width = w
      o.height = h
      const c2 = o.getContext("2d")!
      c2.drawImage(img, 0, 0, w, h)
      const d = c2.getImageData(0, 0, w, h).data
      const L = new Float32Array(w * h)
      let lo = 1, hi = 0
      for (let i = 0; i < w * h; i++) {
        const v = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255
        L[i] = v
        if (v < lo) lo = v
        if (v > hi) hi = v
      }
      for (let i = 0; i < w * h; i++) L[i] = (L[i] - lo) / (hi - lo || 1)
      URL.revokeObjectURL(url)
      resolve({ L, w, h })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("unreadable"))
    }
    img.src = url
  })
}

export type Layout = { cx: number; top: number; bottom: number; aw: number }
type Options = {
  reduce: boolean
  phone: boolean
  /** CSS-pixel layout box for the object, relative to the canvas */
  layout: () => Layout
  onStage: (stage: number) => void
}

const HOME = { y: -0.55, x: -0.32 }
const NB = 14
const MORPH = 1150

export class CrystalEngine {
  form: Form = "knot"
  block: Block = "cube"
  density = 3
  text = "Maciej"
  photo: Photo | null = null
  count = 0
  a = 0

  private ctx: CanvasRenderingContext2D
  private S!: Float32Array
  private NR!: Float32Array
  private X!: Float32Array
  private C!: Float32Array
  private R!: Float32Array
  private D: Float32Array | null = null
  private half: [number, number, number] = [0.475, 0.475, 0.475]
  private snap: Float32Array | null = null
  private morphT0 = 0
  private aFrom = 0
  private aTo = 0
  private aT0 = 0
  private aDur = 0
  private ry = HOME.y
  private rx = HOME.x
  private auto: boolean
  private swingT = 0
  private visible = false
  private raf = 0
  private last = 0
  private dpr = 1
  private lay = { cx: 0, cy: 0, aw: 1, ah: 1 }
  private buckets: Float32Array[] = []
  private bcount = new Int32Array(NB)
  private shownStage = -1
  private dragging = false
  private drag = { x: 0, y: 0, ry: 0, rx: 0, id: -1 }
  private cleanup: (() => void)[] = []

  constructor(private cv: HTMLCanvasElement, private opts: Options) {
    this.ctx = cv.getContext("2d")!
    this.auto = !opts.reduce
    if (!opts.phone) this.density = 4
    for (let b = 0; b < NB; b++) this.buckets.push(new Float32Array(0))
    this.bindInput()
    const onVis = () => !document.hidden && this.kick()
    document.addEventListener("visibilitychange", onVis)
    this.cleanup.push(() => document.removeEventListener("visibilitychange", onVis))
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    this.cleanup.forEach((f) => f())
  }

  /** Rebuilds the three point sets. Returns false (and keeps the old cloud) when the shape is empty. */
  build(): boolean {
    let n = DENSITY[this.density - 1]
    if (this.opts.phone) n = Math.min(n, 12000)
    let sh: Shape | null
    if (this.form === "text") {
      const t = this.text.trim()
      sh = t ? textShape(n, t, getComputedStyle(this.cv).fontFamily) : null
      if (!sh) return false
    } else if (this.form === "relief") sh = relief(n, terrain, null, 0.72)
    else if (this.form === "photo" && this.photo) sh = photoShape(n, this.photo)
    else sh = knot(n)

    // what is on screen becomes the start of the morph
    const D = this.D
    if (D && this.count && !this.opts.reduce) {
      const snap = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) {
        const j = (i % this.count) * 3
        snap[i * 3] = D[j]
        snap[i * 3 + 1] = D[j + 1]
        snap[i * 3 + 2] = D[j + 2]
      }
      this.snap = snap
      this.morphT0 = performance.now()
    } else this.snap = null

    this.count = n
    this.S = sh.P
    this.NR = sh.N
    this.R = new Float32Array(n)
    this.X = new Float32Array(n * 3)
    this.C = new Float32Array(n * 3)
    this.D = new Float32Array(n * 3)
    const r = rng(99)
    const bd = BLOCKS[this.block], u = 0.95 / 60
    const half: [number, number, number] = [(bd[0] / 2) * u, (bd[1] / 2) * u, (bd[2] / 2) * u]
    const m = 3 * u
    const fit = Math.min((half[0] - m) / sh.half[0], (half[1] - m) / sh.half[1], (half[2] - m) / Math.max(sh.half[2], 0.12))
    const { S, X, C, R } = this
    for (let i = 0; i < n; i++) {
      const k = i * 3, rr = r()
      R[i] = rr
      const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1), sp = 0.18 + 0.4 * r()
      const dx = Math.sin(ph) * Math.cos(th), dy = Math.cos(ph), dz = Math.sin(ph) * Math.sin(th), grow = 1.18 + 0.32 * rr
      X[k] = S[k] * grow + dx * sp
      X[k + 1] = S[k + 1] * grow + dy * sp
      X[k + 2] = S[k + 2] * grow + dz * sp
      C[k] = S[k] * fit + (r() - 0.5) * 0.008
      C[k + 1] = S[k + 1] * fit + (r() - 0.5) * 0.008
      C[k + 2] = S[k + 2] * fit + (r() - 0.5) * 0.02
    }
    this.half = half
    if (this.buckets[0].length < n * 2) for (let b = 0; b < NB; b++) this.buckets[b] = new Float32Array(n * 2)
    this.render()
    this.kick()
    return true
  }

  setForm(f: Form): boolean {
    const prev = this.form
    this.form = f
    if (!this.build()) {
      this.form = prev
      return false
    }
    if (f !== "knot" && prev === "knot") {
      this.swingT = Math.asin(clamp(((this.ry % (2 * Math.PI)) + 0.12) / 0.62, -1, 1)) / 0.45
      if (!this.auto) {
        this.ry = -0.2
        this.rx = -0.18
      }
    }
    return true
  }

  setVisible(v: boolean) {
    this.visible = v
    if (v) {
      this.render()
      this.kick()
    }
  }

  /** Jump (scroll-driven) or animate (buttons) to a stage value. */
  setA(v: number, animate: boolean) {
    if (animate && !this.opts.reduce) {
      this.aFrom = this.a
      this.aTo = v
      this.aT0 = performance.now()
      this.aDur = 900
      this.kick()
    } else {
      if (v === this.a && !this.aDur) return
      this.a = v
      this.aDur = 0
      this.render()
    }
    this.syncStage()
  }

  setReduce(reduce: boolean) {
    if (reduce === this.opts.reduce) return
    this.opts.reduce = reduce
    this.auto = !reduce
    this.kick()
  }

  reset() {
    this.ry = HOME.y
    this.rx = HOME.x
    this.auto = !this.opts.reduce
    this.render()
    this.kick()
  }

  measure() {
    const r = this.cv.getBoundingClientRect()
    if (!r.width) return false
    this.dpr = Math.min(window.devicePixelRatio || 1, this.opts.phone ? 1.5 : 2)
    this.cv.width = Math.round(r.width * this.dpr)
    this.cv.height = Math.round(r.height * this.dpr)
    const l = this.opts.layout()
    const d = this.dpr
    this.lay = { cx: l.cx * d, cy: ((l.top + l.bottom) / 2) * d, aw: l.aw * d, ah: Math.max(80, l.bottom - l.top) * d }
    this.render()
    return true
  }

  private syncStage() {
    const v = this.aDur ? this.aTo : this.a
    const st = stageOf(v)
    // hysteresis: small scroll reversals near a threshold must not flip the stage back and forth
    if (st === this.shownStage || stageOf(v - STAGE_BAND) !== st || stageOf(v + STAGE_BAND) !== st) return
    this.shownStage = st
    this.opts.onStage(st)
  }

  private kick() {
    if (!this.raf && this.visible) this.raf = requestAnimationFrame(this.frame)
  }
  private render() {
    if (!this.raf) {
      this.last = 0
      this.frame(performance.now())
    }
  }

  private frame = (now: number) => {
    this.raf = 0
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0
    this.last = now
    if (this.auto && !this.dragging) {
      if (this.form === "knot") this.ry += dt * 0.32
      else {
        this.swingT += dt
        this.ry = -0.12 + 0.62 * Math.sin(this.swingT * 0.45)
      }
    }
    if (this.aDur) {
      const t = clamp((now - this.aT0) / this.aDur, 0, 1)
      this.a = lerp(this.aFrom, this.aTo, ease(t))
      if (t >= 1) this.aDur = 0
    }
    const morph = this.snap ? clamp((now - this.morphT0) / MORPH, 0, 1) : 1
    this.draw(morph)
    if (this.snap && morph >= 1) this.snap = null
    if (this.visible && !document.hidden && (this.auto || this.aDur || this.snap)) this.raf = requestAnimationFrame(this.frame)
    else this.last = 0
  }

  private draw(morph: number) {
    const { ctx, cv, count: N, S, X, C, R, NR, D, snap, buckets, bcount, lay, half } = this
    const W = cv.width, H = cv.height
    if (!W || !N || !D) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, W, H)
    const a = this.a
    const t1 = ease(clamp(a * 2, 0, 1)), t2 = ease(clamp(a * 2 - 1, 0, 1)), cr = smooth(0.55, 0.95, a)
    const rad = Math.hypot(half[0], half[1], half[2])
    const hx = lerp(lerp(1.32, 1.62, t1), Math.max(half[0], rad * 0.82), t2)
    const hy = lerp(lerp(1.32, 1.62, t1), Math.max(half[1], rad * 0.78), t2)
    const s = Math.min((lay.ah * 0.5) / hy, (lay.aw * 0.5) / hx) * 0.9
    const cyy = Math.cos(this.ry), sy = Math.sin(this.ry), cxx = Math.cos(this.rx), sx = Math.sin(this.rx), DIST = 4.2
    const LX = -0.42, LY = 0.55, LZ = 0.72
    for (let i = 0; i < NB; i++) bcount[i] = 0
    const cxp = lay.cx, cyp = lay.cy, shade = 1 - smooth(0.05, 0.6, a)
    for (let i = 0; i < N; i++) {
      const k = i * 3
      let x = t2 ? lerp(lerp(S[k], X[k], t1), C[k], t2) : lerp(S[k], X[k], t1)
      let y = t2 ? lerp(lerp(S[k + 1], X[k + 1], t1), C[k + 1], t2) : lerp(S[k + 1], X[k + 1], t1)
      let z = t2 ? lerp(lerp(S[k + 2], X[k + 2], t1), C[k + 2], t2) : lerp(S[k + 2], X[k + 2], t1)
      if (snap) {
        const m = easeOut(clamp((morph - R[i] * 0.35) / 0.65, 0, 1))
        x = lerp(snap[k], x, m)
        y = lerp(snap[k + 1], y, m)
        z = lerp(snap[k + 2], z, m)
      }
      D[k] = x
      D[k + 1] = y
      D[k + 2] = z
      const x1 = x * cyy + z * sy, z1 = -x * sy + z * cyy, y2 = y * cxx - z1 * sx, z2 = y * sx + z1 * cxx
      const f = DIST / (DIST - z2), px = cxp + x1 * s * f, py = cyp - y2 * s * f
      const depth = clamp((z2 + 1.2) / 2.4, 0, 1)
      let lum = 0.35 + 0.65 * depth
      if (shade > 0) {
        const nx = NR[k], ny = NR[k + 1], nz = NR[k + 2]
        const n1 = nx * cyy + nz * sy, nz1 = -nx * sy + nz * cyy, n2 = ny * cxx - nz1 * sx, nz2 = ny * sx + nz1 * cxx
        if (nz2 < -0.05 && R[i] < shade * 0.92) continue
        let lam = n1 * LX + n2 * LY + nz2 * LZ
        if (nz2 < 0) lam = -lam * 0.25
        lam = clamp(lam, 0, 1)
        lum = lerp(lum, 0.08 + 0.92 * lam, shade)
      }
      const bi = Math.min(NB - 1, Math.floor(lum * NB)), c = bcount[bi]
      buckets[bi][c] = px
      buckets[bi][c + 1] = py
      bcount[bi] = c + 2
    }
    if (cr > 0.01) this.drawBlock(cr, s, cyy, sy, cxx, sx, DIST)
    const size = lerp(1.8, 1.45, cr) * this.dpr, hs = size / 2
    ctx.globalCompositeOperation = cr > 0.5 ? "lighter" : "source-over"
    for (let i = 0; i < NB; i++) {
      const L = (i + 0.5) / NB, bb = buckets[i], cnt = bcount[i]
      if (!cnt) continue
      const k = lerp(L, 1, cr * 0.4)
      const rC = Math.round(lerp(236, 150 + 90 * L, cr) * k)
      const gC = Math.round(lerp(238, 205 + 45 * L, cr) * k)
      const bC = Math.round(lerp(244, 255, cr) * k)
      ctx.fillStyle = `rgba(${rC},${gC},${bC},${cr > 0.5 ? (0.28 + 0.6 * L).toFixed(3) : "1"})`
      for (let j = 0; j < cnt; j += 2) ctx.fillRect(bb[j] - hs, bb[j + 1] - hs, size, size)
    }
    ctx.globalCompositeOperation = "source-over"
  }

  private drawBlock(alpha: number, s: number, cyy: number, sy: number, cxx: number, sx: number, DIST: number) {
    const { ctx, half: h, lay } = this
    const P: [number, number, number][] = []
    for (let i = 0; i < 8; i++) {
      const x = i & 1 ? h[0] : -h[0], y = i & 2 ? h[1] : -h[1], z = i & 4 ? h[2] : -h[2]
      const x1 = x * cyy + z * sy, z1 = -x * sy + z * cyy, y2 = y * cxx - z1 * sx, z2 = y * sx + z1 * cxx, f = DIST / (DIST - z2)
      P.push([lay.cx + x1 * s * f, lay.cy - y2 * s * f, z2])
    }
    const F = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]]
    ctx.fillStyle = `rgba(190,220,255,${(0.035 * alpha).toFixed(3)})`
    for (const q of F) {
      ctx.beginPath()
      ctx.moveTo(P[q[0]][0], P[q[0]][1])
      for (let j = 1; j < 4; j++) ctx.lineTo(P[q[j]][0], P[q[j]][1])
      ctx.closePath()
      ctx.fill()
    }
    const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]
    ctx.lineWidth = Math.max(1, this.dpr * 1.1)
    for (const e of E) {
      const p = P[e[0]], q = P[e[1]], front = (p[2] + q[2]) / 2 > 0
      ctx.strokeStyle = `rgba(214,232,255,${((front ? 0.5 : 0.16) * alpha).toFixed(3)})`
      ctx.beginPath()
      ctx.moveTo(p[0], p[1])
      ctx.lineTo(q[0], q[1])
      ctx.stroke()
    }
  }

  private bindInput() {
    const cv = this.cv
    const down = (e: PointerEvent) => {
      this.dragging = true
      this.drag = { x: e.clientX, y: e.clientY, ry: this.ry, rx: this.rx, id: e.pointerId }
      this.auto = false
      if (e.pointerType === "mouse") cv.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!this.dragging || e.pointerId !== this.drag.id) return
      this.ry = this.drag.ry + (e.clientX - this.drag.x) * 0.008
      if (e.pointerType === "mouse") this.rx = clamp(this.drag.rx + (e.clientY - this.drag.y) * 0.006, -1.3, 1.3)
      this.render()
    }
    const stop = () => {
      this.dragging = false
      this.drag.id = -1
    }
    const key = (e: KeyboardEvent) => {
      const step = 0.18
      if (e.key === "ArrowLeft") this.ry -= step
      else if (e.key === "ArrowRight") this.ry += step
      else if (e.key === "ArrowUp") this.rx = clamp(this.rx - step, -1.3, 1.3)
      else if (e.key === "ArrowDown") this.rx = clamp(this.rx + step, -1.3, 1.3)
      else if (e.key === "Home") {
        e.preventDefault()
        this.reset()
        return
      } else return
      e.preventDefault()
      this.auto = false
      this.render()
    }
    cv.addEventListener("pointerdown", down)
    cv.addEventListener("pointermove", move)
    cv.addEventListener("pointerup", stop)
    cv.addEventListener("pointercancel", stop)
    cv.addEventListener("keydown", key)
    this.cleanup.push(() => {
      cv.removeEventListener("pointerdown", down)
      cv.removeEventListener("pointermove", move)
      cv.removeEventListener("pointerup", stop)
      cv.removeEventListener("pointercancel", stop)
      cv.removeEventListener("keydown", key)
    })
  }
}
