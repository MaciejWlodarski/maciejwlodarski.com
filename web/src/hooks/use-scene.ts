import { useEffect, useRef, useSyncExternalStore } from "react"
import { clamp } from "@/lib/motion"

/*
 * Scenes are "pinned" (sticky, driven by scroll) only on screens tall enough
 * and without reduced motion. The inline script in __root.tsx applies the same
 * rule before first paint, so CSS (`pin:` variant) and React agree from the start.
 */
export type SceneMode = { pinned: boolean; reduce: boolean }

const SERVER_MODE: SceneMode = { pinned: false, reduce: false }
let mode: SceneMode = SERVER_MODE
const modeListeners = new Set<() => void>()

function readMode(): SceneMode {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const pinned = !reduce && window.innerHeight >= 460 && window.innerWidth >= 320
  return { pinned, reduce }
}
function refreshMode() {
  const next = readMode()
  document.documentElement.toggleAttribute("data-pin", next.pinned)
  if (next.pinned !== mode.pinned || next.reduce !== mode.reduce) {
    mode = next
    modeListeners.forEach((f) => f())
  }
}
function subscribeMode(cb: () => void) {
  if (modeListeners.size === 0) {
    window.addEventListener("resize", refreshMode)
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", refreshMode)
  }
  modeListeners.add(cb)
  // Redact does not re-read the snapshot after subscribing, so push the
  // client value (server render assumed resting mode) explicitly.
  queueMicrotask(refreshMode)
  return () => {
    modeListeners.delete(cb)
    if (modeListeners.size === 0) {
      window.removeEventListener("resize", refreshMode)
      window.matchMedia("(prefers-reduced-motion: reduce)").removeEventListener("change", refreshMode)
    }
  }
}

export function useSceneMode(): SceneMode {
  return useSyncExternalStore(
    subscribeMode,
    () => mode,
    () => SERVER_MODE
  )
}

/* One rAF-throttled scroll/resize loop shared by every scene. */
const scrollListeners = new Set<() => void>()
let ticking = false
function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    ticking = false
    scrollListeners.forEach((f) => f())
  })
}

/** Calls `cb` on every scroll frame. `cb` should touch the DOM directly, not set state each frame. */
export function useScrollFrame(cb: () => void) {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    const f = () => ref.current()
    if (scrollListeners.size === 0) {
      window.addEventListener("scroll", onScroll, { passive: true })
      window.addEventListener("resize", onScroll)
    }
    scrollListeners.add(f)
    f()
    return () => {
      scrollListeners.delete(f)
      if (scrollListeners.size === 0) {
        window.removeEventListener("scroll", onScroll)
        window.removeEventListener("resize", onScroll)
      }
    }
  }, [])
}

/** 0 when the section top meets the viewport top, 1 when its bottom meets the viewport bottom. */
export function sceneProgress(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  const span = r.height - window.innerHeight
  return span > 0 ? clamp(-r.top / span, 0, 1) : 0
}

export function scrollToProgress(el: HTMLElement, p: number, reduce: boolean) {
  const r = el.getBoundingClientRect()
  const span = r.height - window.innerHeight
  window.scrollTo({ top: Math.round(window.scrollY + r.top + p * span), behavior: reduce ? "auto" : "smooth" })
}

export function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  el.setAttribute("tabindex", "-1")
  el.focus({ preventScroll: true })
}

/** Staggered entrances for every `[data-reveal]` block on the page. */
export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"))
    els.forEach((el) =>
      Array.from(el.children).forEach((c, i) => {
        const h = c as HTMLElement
        if (!h.style.getPropertyValue("--k")) h.style.setProperty("--k", String(i))
      })
    )
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in")
            io.unobserve(e.target)
          }
        }),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}
