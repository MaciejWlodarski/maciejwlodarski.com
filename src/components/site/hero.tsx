import { useEffect, useState } from "react"
import { ArrowDownIcon } from "lucide-react"
import { cn } from "cn"

import { buttonVariants } from "@/components/ui/button"
import { SocialLinks } from "@/components/site/brand-icons"
import { EMAIL, LINKS } from "@/lib/motion"
import { useSceneMode } from "@/hooks/use-scene"
import { useCopy } from "@/lib/i18n"

const COPY = {
  pl: {
    words: ["aplikacje.", "narzędzia.", "integracje.", "automatyzacje."],
    title: "Zamieniam pomysły w aplikacje, narzędzia, integracje i automatyzacje.",
    lead1: "Zamieniam pomysły w",
    // the first line is about 10.2em long, so it fills the column without wrapping
    size: "text-[min(96px,9.4cqi)]",
    lead: "Jestem Maciej Włodarski. Piszę aplikacje web, desktop i CLI, łączę systemy i automatyzuję powtarzalną pracę, także z pomocą AI. Od małej poprawki po całe narzędzie.",
    subject: "Zlecenie",
    write: "Napisz do mnie",
    demo: "Zobacz demo",
  },
  en: {
    words: ["apps.", "tools.", "integrations.", "automations."],
    title: "I turn ideas into apps, tools, integrations and automations.",
    lead1: "I turn ideas into",
    // a shorter line (about 6.9em), so it runs larger than the Polish one
    size: "text-[min(112px,14.4cqi)]",
    lead: "I’m Maciej Włodarski. I build web, desktop and CLI apps, connect systems and automate repetitive work, including with AI. From a small fix to a complete tool.",
    subject: "Project inquiry",
    write: "Get in touch",
    demo: "See the demo",
  },
}
const WORD_MS = 2200

function RotatingWord({ words: WORDS }: { words: string[] }) {
  const { reduce } = useSceneMode()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduce) return setI(0)
    const t = setInterval(() => !document.hidden && setI((n) => (n + 1) % WORDS.length), WORD_MS)
    return () => clearInterval(t)
  }, [reduce])
  const prev = (i - 1 + WORDS.length) % WORDS.length
  return (
    // every word sits in the same grid cell, so the line keeps the widest word's width
    <span className="-mb-[0.22em] grid overflow-hidden pb-[0.22em]">
      {WORDS.map((w, k) => (
        <span
          key={w}
          className={cn(
            "text-primary transition-[translate,opacity] duration-700 ease-(--ease-expo) [grid-area:1/1]",
            k === i ? "translate-y-0 opacity-100" : k === prev ? "-translate-y-full opacity-0" : "translate-y-full opacity-0"
          )}
        >
          {w}
        </span>
      ))}
    </span>
  )
}

export function Hero() {
  const t = useCopy(COPY)
  return (
    <section id="top" aria-labelledby="hero-h" className="pt-[clamp(40px,7vw,96px)] pb-[clamp(36px,4vw,56px)]">
      <div className="wrap grid items-center gap-x-14 gap-y-8 min-[901px]:grid-cols-[1.7fr_1fr]">
        <h1 id="hero-h" className="[container-type:inline-size] font-heading leading-[0.98] font-bold tracking-[-0.042em]">
          <span className="sr-only">{t.title}</span>
          {/* sized off the column width, so the first line never wraps */}
          <span aria-hidden className={cn("block", t.size)}>
            <span className="-mb-[0.08em] block overflow-hidden pb-[0.08em]">
              <span className="block whitespace-nowrap [animation-delay:80ms] motion-safe:animate-rise">{t.lead1}</span>
            </span>
            {/* padding keeps the descenders (g, j) inside the clipping boxes */}
            <span className="-mb-[0.22em] block overflow-hidden pb-[0.22em]">
              <span className="block [animation-delay:180ms] motion-safe:animate-rise">
                <RotatingWord words={t.words} />
              </span>
            </span>
          </span>
        </h1>
        <div>
          <p className="max-w-[36ch] text-[clamp(19px,1.6vw,22px)] leading-[1.45] [animation-delay:380ms] motion-safe:animate-fade-up">
            {t.lead}
          </p>
          {/* one row: primary action, secondary action, then socials as quiet icons */}
          <div className="mt-7 flex flex-wrap items-center gap-2 [animation-delay:480ms] motion-safe:animate-fade-up">
            <a href={`mailto:${EMAIL}?subject=${encodeURIComponent(t.subject)}`} className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-full px-[22px] text-[17px]")}>
              {t.write}
            </a>
            <a
              href="#demo-3d"
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "h-11 rounded-full px-5 text-[17px] has-data-[icon=inline-end]:pr-4")}
            >
              {t.demo} <ArrowDownIcon data-icon="inline-end" />
            </a>
            <span aria-hidden className="mx-1.5 h-6 w-px bg-border max-sm:hidden" />
            <SocialLinks github={LINKS.github} x={LINKS.x} />
          </div>
        </div>
      </div>
    </section>
  )
}
