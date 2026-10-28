import { useEffect, useRef, useState } from "react"
import { cn } from "cn"

import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CrystalEngine, type Form } from "@/lib/crystal-engine"
import { useCommand } from "@/lib/commands"
import { clamp, group, pluralPoints, smooth } from "@/lib/motion"
import { useCopy, useLang } from "@/lib/i18n"
import { sceneProgress, scrollToProgress, scrollToSection, useSceneMode, useScrollFrame } from "@/hooks/use-scene"

const COPY = {
  pl: {
    steps: [
      { title: "Model.", body: "Kształt z modelu 3D albo z napisu." },
      { title: "Chmura punktów.", body: "Powierzchnia rozpada się na tysiące punktów." },
      { title: "Ułożone w bryle.", body: "Punkty mieszczą się w bryle, z marginesem od ścianek." },
    ],
    stageName: ["model 3D", "chmura punktów", "układ w bryle"],
    forms: { knot: "Węzeł", text: "Napis" } as Record<Form, string>,
    textName: (w: string) => `Napis „${w}”`,
    canvas: (name: string, stage: string, count: string, points: string) =>
      `${name}: ${stage}, ${count} ${points}. Przeciągnij albo użyj strzałek, żeby obrócić. Home przywraca widok.`,
    needText: "Wpisz napis, a punkty ułożą się w litery.",
    eyebrow: "Od modelu do bryły",
    dock: "Sterowanie podglądem 3D",
    stage: "Etap",
    stages: ["Model", "Punkty", "Bryła"],
    form: "Forma",
    text: "Napis",
    note1: "To ilustracja zasady, nad którą pracuję w Luminie, a nie ekran programu. Przeciągnij obiekt, żeby go obrócić.",
    note2: " to moja aplikacja desktopowa i CLI. Zamienia zdjęcia i modele w chmury punktów, pozwala ułożyć scenę w bryle i wyeksportować plik do grawera. Kod jest prywatny.",
  },
  en: {
    steps: [
      { title: "Model.", body: "A shape from a 3D model or from text." },
      { title: "Point cloud.", body: "The surface breaks up into thousands of points." },
      { title: "Inside the crystal.", body: "The points fit inside a glass block, with room around the edges." },
    ],
    stageName: ["3D model", "point cloud", "inside the crystal"],
    forms: { knot: "Knot", text: "Text" } as Record<Form, string>,
    textName: (w: string) => `Text “${w}”`,
    canvas: (name: string, stage: string, count: string, points: string) =>
      `${name}: ${stage}, ${count} ${points}. Drag or use the arrow keys to rotate. Home resets the view.`,
    needText: "Type some text and the points will form the letters.",
    eyebrow: "From model to crystal",
    dock: "3D preview controls",
    stage: "Stage",
    stages: ["Model", "Points", "Crystal"],
    form: "Shape",
    text: "Text",
    note1: "This illustrates an idea I’m working on in Lumina; it isn’t a screen from the app. Drag the object to rotate it.",
    note2: " is my desktop and CLI app. It turns photos and models into point clouds, lets you arrange a scene inside a crystal and exports a file for the engraver. The code is private.",
  },
}
// scroll positions that show each stage at rest
const STAGE_P = [0.02, 0.46, 0.96]

/** short holds so every bit of scroll visibly moves the object */
const fromScroll = (p: number) =>
  p < 0.04 ? 0 : p < 0.42 ? 0.5 * smooth(0.04, 0.42, p) : p < 0.5 ? 0.5 : p < 0.9 ? 0.5 + 0.5 * smooth(0.5, 0.9, p) : 1

export function CrystalScene() {
  const { pinned, reduce } = useSceneMode()
  const lang = useLang()
  const t = useCopy(COPY)
  const secRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<CrystalEngine | null>(null)
  const progressRef = useRef<HTMLSpanElement>(null)
  const pinnedRef = useRef(pinned)
  pinnedRef.current = pinned

  const [stage, setStage] = useState(0)
  const [form, setFormState] = useState<Form>("knot")
  const [text, setText] = useState("Maciej")
  const [count, setCount] = useState(0)
  const [msg, setMsg] = useState("")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const cv = canvasRef.current!
    const stageEl = stageRef.current!
    const sec = secRef.current!
    const phone = Math.min(window.innerWidth, window.innerHeight) < 600
    const engine = new CrystalEngine(cv, {
      reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      phone,
      onStage: setStage,
      layout: () => {
        const r = cv.getBoundingClientRect()
        const sr = stageEl.getBoundingClientRect()
        const over = overRef.current!.getBoundingClientRect()
        const dock = dockRef.current!.getBoundingClientRect()
        const wide = sr.width > 900
        const insetVar = sec.style.getPropertyValue("--inset")
        const inset = insetVar ? parseFloat(insetVar) : padPx()
        return {
          cx: wide ? r.width * 0.42 : r.width / 2,
          top: wide ? 70 : over.bottom - r.top + 8,
          bottom: dock.top - r.top - 12,
          aw: wide ? r.width * 0.9 - inset : r.width - 2 * inset - 24,
        }
      },
    })
    engineRef.current = engine
    engine.build()
    setCount(engine.count)
    engine.measure()
    setReady(true)

    const io = new IntersectionObserver((es) => engine.setVisible(es[0].isIntersecting), { rootMargin: "80px" })
    io.observe(stageEl)
    const ro = new ResizeObserver(() => engine.measure())
    ro.observe(stageEl)
    return () => {
      io.disconnect()
      ro.disconnect()
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  // resting mode shows the finished crystal; pinned mode lets scroll drive it
  useEffect(() => {
    const engine = engineRef.current
    const sec = secRef.current
    if (!engine || !sec) return
    engine.setReduce(reduce)
    if (!pinned) {
      sec.style.removeProperty("--inset")
      sec.style.removeProperty("--round")
      engine.setA(1, false)
    } else syncScroll()
    requestAnimationFrame(() => engine.measure())
  }, [pinned, reduce])

  const syncScroll = () => {
    const engine = engineRef.current
    const sec = secRef.current
    if (!engine || !sec || !pinnedRef.current) return
    const p = sceneProgress(sec)
    engine.setA(fromScroll(p), false)
    progressRef.current?.style.setProperty("transform", `scaleX(${p.toFixed(3)})`)
    // the stage grows from an inset rounded card to full bleed as it reaches the top
    const r = sec.getBoundingClientRect()
    const k = clamp(r.top / (window.innerHeight * 0.55), 0, 1)
    const pad = padPx()
    sec.style.setProperty("--inset", `${(pad * k).toFixed(1)}px`)
    sec.style.setProperty("--round", `${(28 * k).toFixed(1)}px`)
  }
  useScrollFrame(syncScroll)

  function goStage(i: number) {
    const engine = engineRef.current
    if (!engine) return
    if (pinnedRef.current && secRef.current) scrollToProgress(secRef.current, STAGE_P[i], reduce)
    else engine.setA(i / 2, true)
  }

  function applyForm(f: Form) {
    const engine = engineRef.current
    if (!engine) return
    if (f === "text") engine.text = text
    if (!engine.setForm(f)) {
      setMsg(t.needText)
      return
    }
    setFormState(f)
    setCount(engine.count)
    setMsg("")
  }

  useCommand("crystal:form", (f) => {
    scrollToSection("demo-3d")
    applyForm(f)
  })
  useCommand("crystal:stage", (i) => {
    if (!pinnedRef.current) scrollToSection("demo-3d")
    goStage(i)
  })

  // typing rebuilds the letters after a short pause
  useEffect(() => {
    const engine = engineRef.current
    if (!engine || form !== "text") return
    const id = setTimeout(() => {
      engine.text = text
      if (engine.build()) setMsg("")
      else setMsg(t.needText)
    }, 160)
    return () => clearTimeout(id)
  }, [text, form])

  const name = form === "text" ? t.textName(text.trim()) : t.forms[form]
  const label = t.canvas(name, t.stageName[stage], group(count, lang), pluralPoints(count, lang))

  return (
    <section
      ref={secRef}
      id="demo-3d"
      aria-labelledby="s3d-h"
      data-tone="dark"
      // links land on the very top, where the stage is already full bleed
      className="relative -scroll-mt-16 [--inset:var(--pad)] [--round:var(--radius-scene)] pin:h-[calc(var(--screen)*2.1)]"
    >
      <div
        ref={stageRef}
        data-stage
        className="dark relative h-[clamp(560px,calc(var(--screen)*0.86),880px)] overflow-clip bg-background text-foreground [clip-path:inset(0_var(--inset)_round_var(--round))] motion-safe:animate-stage-in max-[900px]:rest:h-[clamp(760px,calc(var(--screen)*1.15),1000px)] pin:sticky pin:top-0 pin:h-(--screen)"
      >
        {/* light pooling under the object, not decoration */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_46%_at_60%_74%,rgb(79_168_255/0.13),transparent_70%),radial-gradient(40%_30%_at_60%_30%,rgb(255_255_255/0.05),transparent_70%)]"
        />
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={label}
          className="absolute inset-0 size-full cursor-grab touch-pan-y active:cursor-grabbing min-[901px]:left-[34%] min-[901px]:w-[66%]"
        />
        <div
          ref={overRef}
          className="pointer-events-none absolute inset-x-0 top-0 px-[calc(var(--inset)+var(--pad))] pt-[92px] max-[900px]:pt-[76px] max-sm:pt-[70px]"
        >
          <h2 id="s3d-h" className="text-[17px] font-semibold text-muted-foreground">
            {t.eyebrow}
          </h2>
          <div className="relative mt-3.5 max-w-[30ch] pin:h-[11.5em] max-[900px]:pin:h-[7.6em] max-sm:pin:h-[6.6em]">
            {t.steps.map((s, i) => (
              <div
                key={s.title}
                aria-hidden={pinned && i !== stage}
                className={cn(
                  "transition-opacity duration-300 rest:not-first:mt-[18px]",
                  "pin:invisible pin:absolute pin:inset-x-0 pin:top-0 pin:translate-y-[18px] pin:opacity-0 pin:transition-[opacity,transform,visibility] pin:duration-[420ms,620ms,0s] pin:ease-(--ease-expo)",
                  i === stage
                    ? "pin:visible pin:translate-y-0 pin:opacity-100"
                    : "rest:opacity-45 pin:delay-[0s,0s,420ms]"
                )}
              >
                <h3 className="display text-[clamp(26px,2.6vw,36px)] pin:text-[clamp(34px,4.4vw,64px)] pin:tracking-[-0.035em]">
                  {s.title}
                </h3>
                <p className="mt-1.5 max-w-[34ch] text-[17px] text-muted-foreground pin:mt-3 pin:max-w-[26ch] pin:text-[clamp(17px,1.4vw,21px)] max-sm:text-base">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
          {/* scroll progress through the scene, so holds never feel stuck */}
          <div aria-hidden className="mt-1 hidden h-[3px] w-40 overflow-hidden rounded-full bg-white/12 pin:block max-sm:w-28">
            <span ref={progressRef} className="block h-full origin-left rounded-full bg-primary [transform:scaleX(0)]" />
          </div>
        </div>

        <div
          ref={dockRef}
          role="group"
          aria-label={t.dock}
          className={cn(
            "absolute inset-x-[calc(var(--inset)+var(--pad))] bottom-7 flex flex-wrap items-end gap-x-[22px] gap-y-3.5 transition-opacity duration-500 max-sm:bottom-4 max-sm:gap-x-3 max-sm:gap-y-2.5",
            !ready && "opacity-0"
          )}
        >
          <DockGroup label={t.stage}>
            <ToggleGroup spacing={0} className="seg" aria-label={t.stage} value={[String(stage)]} onValueChange={([v]) => v && goStage(+v)}>
              {t.stages.map((l, i) => (
                <ToggleGroupItem key={l} value={String(i)}>
                  {l}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </DockGroup>
          <DockGroup label={t.form}>
            <ToggleGroup spacing={0} className="seg" aria-label={t.form} value={[form]} onValueChange={([v]) => v && applyForm(v as Form)}>
              <ToggleGroupItem value="knot">{t.forms.knot}</ToggleGroupItem>
              <ToggleGroupItem value="text">{t.forms.text}</ToggleGroupItem>
            </ToggleGroup>
          </DockGroup>
          {form === "text" && (
            <DockGroup label={t.text} htmlFor="crystal-word">
              <Input
                id="crystal-word"
                value={text}
                maxLength={12}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setText(e.target.value)}
                className="h-[38px] w-[9.5em] rounded-full bg-white/10 px-3.5 text-[15px] max-sm:w-[7.5em]"
              />
            </DockGroup>
          )}
          <p aria-live="polite" className="min-h-[1.2em] basis-full pl-1 text-[13px] text-muted-foreground">
            {msg}
          </p>
        </div>
      </div>

      <div className="wrap grid gap-x-14 gap-y-4 pt-[30px] text-[17px] min-[901px]:grid-cols-[1fr_1.1fr]">
        <p className="max-w-[54ch]">
          {t.note1}
        </p>
        <p className="max-w-[54ch]">
          <strong className="font-semibold">Lumina</strong>
          {t.note2}
        </p>
      </div>
    </section>
  )
}

/** resolved px of the page gutter (--pad is a clamp(), so read it off a .wrap) */
function padPx() {
  const w = document.querySelector(".wrap")
  return w ? parseFloat(getComputedStyle(w).paddingLeft) || 0 : 0
}

function DockGroup({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  const Label = htmlFor ? "label" : "span"
  return (
    <div className="grid gap-[7px]">
      <Label htmlFor={htmlFor} className="pl-1 text-xs text-muted-foreground max-sm:sr-only">
        {label}
      </Label>
      {children}
    </div>
  )
}
