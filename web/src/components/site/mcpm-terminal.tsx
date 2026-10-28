import { useEffect, useRef, useState } from "react"
import { cn } from "cn"

import { useSceneMode } from "@/hooks/use-scene"
import { useCopy } from "@/lib/i18n"

/*
 * A typed-out session of real mcpm commands. Output lines are a shortened
 * description of what each command does, not captured output.
 * Both languages have the same number of steps and lines.
 */
const COPY = {
  pl: {
    session: [
      { cmd: "mcpm init ./moj-modpack", out: ["profil moj-modpack: wersja gry i loader Fabric"] },
      { cmd: "mcpm install sodium", out: ["Modrinth: sodium razem z zależnościami", "zapisane w lockfile tego profilu"] },
      { cmd: "mcpm launch", out: ["klient, biblioteki i Java od Mojanga, w cache", "gra startuje bez oficjalnego launchera"] },
    ],
    label:
      "Przykładowa sesja: mcpm init tworzy profil z Fabric, mcpm install sodium dodaje mod z Modrinth z zależnościami, mcpm launch uruchamia grę bez oficjalnego launchera.",
  },
  en: {
    session: [
      { cmd: "mcpm init ./my-modpack", out: ["profile my-modpack: game version and Fabric loader"] },
      { cmd: "mcpm install sodium", out: ["Modrinth: sodium with its dependencies", "saved to this profile’s lockfile"] },
      { cmd: "mcpm launch", out: ["client, libraries and Java from Mojang, cached", "the game starts without the official launcher"] },
    ],
    label:
      "Sample session: mcpm init creates a Fabric profile, mcpm install sodium adds a mod from Modrinth with its dependencies, mcpm launch starts the game without the official launcher.",
  },
}
const STEPS = COPY.pl.session.length
const TYPE_MS = 42
const LINE_MS = 320
const HOLD_MS = 2600

type Pos = { step: number; chars: number; lines: number }
const DONE: Pos = { step: STEPS, chars: 0, lines: 0 }

export function McpmTerminal() {
  const { reduce } = useSceneMode()
  const t = useCopy(COPY)
  const SESSION = t.session
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const [pos, setPos] = useState<Pos>({ step: 0, chars: 0, lines: 0 })

  useEffect(() => {
    const io = new IntersectionObserver((es) => setInView(es[0].isIntersecting), { threshold: 0.4 })
    io.observe(ref.current!)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (reduce || !inView) return
    const cur = SESSION[pos.step]
    let next: Pos, wait: number
    if (!cur) [next, wait] = [{ step: 0, chars: 0, lines: 0 }, HOLD_MS]
    else if (pos.chars < cur.cmd.length) [next, wait] = [{ ...pos, chars: pos.chars + 1 }, pos.chars === 0 ? 500 : TYPE_MS]
    else if (pos.lines < cur.out.length) [next, wait] = [{ ...pos, lines: pos.lines + 1 }, LINE_MS]
    else [next, wait] = [{ step: pos.step + 1, chars: 0, lines: 0 }, 700]
    const t = setTimeout(() => setPos(next), wait)
    return () => clearTimeout(t)
  }, [pos, reduce, inView])

  const shown = reduce ? DONE : pos

  return (
    <div ref={ref} className="dark overflow-hidden rounded-[18px] bg-[#0d0d0f] text-foreground shadow-[0_24px_60px_-24px_rgb(0_0_0/0.45)]">
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[13px] text-muted-foreground">Terminal — mcpm</span>
      </div>
      <div
        role="img"
        aria-label={t.label}
        className="px-5 py-4 font-mono text-[13.5px] leading-[1.75] max-sm:text-[12px]"
      >
        {/* every line is always laid out (hidden until typed), so the card never changes height */}
        {SESSION.map((s, i) => {
          const typed = i < shown.step ? s.cmd : i === shown.step ? s.cmd.slice(0, shown.chars) : ""
          const lines = i < shown.step ? s.out.length : i === shown.step ? shown.lines : 0
          const typing = i === shown.step && shown.chars < s.cmd.length
          return (
            <div key={s.cmd} className="not-first:mt-1.5">
              <div className={cn("whitespace-pre", i > shown.step && "invisible")}>
                <span className="text-primary">❯ </span>
                {typed || "\u00a0"}
                {typing && <Caret />}
              </div>
              {s.out.map((l, k) => (
                <div key={l} className={cn("text-muted-foreground", k < lines ? "motion-safe:animate-in motion-safe:fade-in" : "invisible")}>
                  <span className="text-[#28c840]">✓</span> {l}
                </div>
              ))}
            </div>
          )
        })}
        <div className={cn("mt-1.5", shown.step < SESSION.length && "invisible")}>
          <span className="text-primary">❯ </span>
          <Caret />
        </div>
      </div>
    </div>
  )
}

function Caret() {
  return <span aria-hidden className="ml-px inline-block h-[1.1em] w-[0.55em] translate-y-[0.2em] bg-foreground/80 motion-safe:animate-pulse" />
}
