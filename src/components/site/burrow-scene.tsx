import { useEffect, useRef, useState } from "react"
import { ArrowRightIcon } from "lucide-react"
import { cn } from "cn"

import { LINKS } from "@/lib/motion"
import { useSceneMode } from "@/hooks/use-scene"
import { useCopy } from "@/lib/i18n"

/*
 * The screenshot stays at its natural scale (zooming a 1180 px capture
 * pixelates). Each step lights up its part of the window instead.
 */
const IW = 1180, IH = 730
// regions of the screenshot: whole window, search, smart folders, file list
const REGIONS = [
  [0, 0, 1180, 730],
  [8, 92, 1164, 40],
  [6, 292, 192, 246],
  [204, 180, 974, 312],
]
const COPY = {
  pl: {
    steps: [
      ["Natywne okno", "Cztery widoki plików, karty, inspektor i panel komend."],
      ["Wyszukiwanie", "Indeksowane wyszukiwanie i filtry nad listą."],
      ["Inteligentne foldery", "Ostatnie 24 godziny, kod źródłowy, zmiany w Git."],
      ["Lista plików", "Rozmiary, daty i rodzaje, sortowanie i zaznaczanie wielu pozycji."],
    ],
    lead: "Menedżer plików na macOS w SwiftUI i AppKit. Dwa panele obok siebie, wyszukiwanie i metadane w jednym oknie.",
    code: "Kod na GitHubie",
    alt: "Okno aplikacji Burrow: pasek boczny z inteligentnymi folderami, pole wyszukiwania i lista przykładowych plików z rozmiarem, datą i rodzajem.",
    caption: "Widok listy na przykładowych plikach.",
  },
  en: {
    steps: [
      ["Native window", "Four file views, tabs, an inspector and a command palette."],
      ["Search", "Indexed search and filters above the list."],
      ["Smart folders", "Last 24 hours, source code, Git changes."],
      ["File list", "Sizes, dates and kinds, sorting and multi-selection."],
    ],
    lead: "A file manager for macOS built with SwiftUI and AppKit. Two panes side by side, search and metadata in one window.",
    code: "Code on GitHub",
    alt: "The Burrow window: a sidebar with smart folders, a search field and a list of sample files with size, date and kind.",
    caption: "List view with sample files.",
  },
}
const CYCLE_MS = 3800

export function BurrowScene() {
  const { reduce } = useSceneMode()
  const t = useCopy(COPY)
  const STEPS = t.steps.map(([title, body], i) => ({ title, body, r: REGIONS[i] }))
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(true)
  const [inView, setInView] = useState(false)
  const winRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const io = new IntersectionObserver((es) => setInView(es[0].isIntersecting), { threshold: 0.5 })
    io.observe(winRef.current!)
    return () => io.disconnect()
  }, [])

  // walk through the steps while on screen, until the visitor picks one
  useEffect(() => {
    if (!auto || reduce || !inView) return
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), CYCLE_MS)
    return () => clearInterval(t)
  }, [auto, reduce, inView])

  const choose = (i: number) => {
    setAuto(false)
    setStep(i)
  }
  const [x, y, w, h] = STEPS[step].r
  const whole = step === 0

  return (
    <section id="burrow" aria-labelledby="bf-h" className="py-[clamp(80px,9vw,140px)]">
      <div className="wrap grid items-center gap-x-16 gap-y-10 min-[901px]:grid-cols-[0.72fr_1.6fr]">
        <div className="max-[900px]:contents">
          <h2 id="bf-h" className="display order-1 text-[clamp(36px,5vw,72px)] leading-none">
            Burrow
          </h2>
          <p className="order-2 mt-3.5 max-w-[32ch] text-lg max-[900px]:-mt-2">
            {t.lead}
          </p>
          <div className="order-4 mt-[26px] grid gap-1 max-[900px]:mt-0">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                aria-pressed={i === step}
                onClick={() => choose(i)}
                onPointerEnter={(e) => e.pointerType === "mouse" && choose(i)}
                className="group relative -ml-3.5 block w-full cursor-pointer overflow-hidden rounded-[14px] px-3.5 py-2.5 text-left opacity-45 transition-[opacity,background-color] duration-300 hover:bg-foreground/5 aria-pressed:opacity-100"
              >
                <b className="block text-[19px] font-semibold tracking-[-0.01em]">{s.title}</b>
                <span className="mt-0.5 block text-[15px] leading-[1.4] text-muted-foreground">{s.body}</span>
                {/* timer for the automatic walk-through */}
                {auto && !reduce && i === step && (
                  <span
                    key={`${step}-${inView}`}
                    aria-hidden
                    className="absolute bottom-0 left-3.5 h-0.5 w-[calc(100%-28px)] origin-left rounded-full bg-primary/60"
                    style={{ animation: inView ? `bf-timer ${CYCLE_MS}ms linear both` : undefined, transform: inView ? undefined : "scaleX(0)" }}
                  />
                )}
              </button>
            ))}
          </div>
          <p className="order-5 mt-[22px] flex flex-wrap items-center gap-x-[22px] gap-y-2 text-[15px] max-[900px]:mt-0">
            <a className="text-link" href={LINKS.burrow}>
              {t.code} <ArrowRightIcon aria-hidden className="arr size-4 align-[-3px]" />
            </a>
            <span className="text-muted-foreground">Swift, SwiftUI, AppKit</span>
          </p>
        </div>
        <figure className="order-3">
          <div
            ref={winRef}
            className="relative aspect-[1180/730] overflow-clip rounded-xl bg-white shadow-[0_0_0_0.5px_rgb(0_0_0/0.2),0_30px_70px_-20px_rgb(0_0_0/0.35),0_10px_24px_-12px_rgb(0_0_0/0.2)]"
          >
            <img
              src="/assets/burrow-light.png"
              width={IW}
              height={IH}
              decoding="async"
              alt={t.alt}
              className="size-full"
            />
            {/* spotlight: the rest of the window dims around the active region */}
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute rounded-[10px] ring-2 ring-primary transition-all duration-700 ease-(--ease-expo)",
                whole ? "opacity-0 shadow-[0_0_0_9999px_rgb(0_0_0/0)]" : "opacity-100 shadow-[0_0_0_9999px_rgb(0_0_0/0.32)]"
              )}
              style={{ left: `${(x / IW) * 100}%`, top: `${(y / IH) * 100}%`, width: `${(w / IW) * 100}%`, height: `${(h / IH) * 100}%` }}
            />
          </div>
          <figcaption className="mt-3.5 text-sm text-muted-foreground">{t.caption}</figcaption>
        </figure>
      </div>
    </section>
  )
}
