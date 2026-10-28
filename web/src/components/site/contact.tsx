import { useRef, useState } from "react"
import { CheckIcon, CopyIcon, MailIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "cn"
import { Button, buttonVariants } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useCommand } from "@/lib/commands"
import { EMAIL, LINKS } from "@/lib/motion"
import { useModKey } from "@/components/site/site-header"
import { SocialLinks } from "@/components/site/brand-icons"
import { useCopy } from "@/lib/i18n"

const COPY = {
  pl: {
    // six topics fill a 2 × 3 or 3 × 2 grid with no orphan chip
    topics: ["Mała poprawka", "Nowe narzędzie", "Aplikacja", "Integracja", "Automatyzacja", "Coś innego"],
    copied: "Skopiowano adres",
    copyFailed: "Nie udało się skopiować. Zaznacz adres ręcznie.",
    title: "Napisz, co chcesz zrobić.",
    lead: "Wystarczy kilka zdań. Odpiszę z pytaniami albo od razu z propozycją.",
    topic: "O czym chcesz napisać?",
    send: "Napisz e-mail",
    copyLabel: "Kopiuj adres e-mail",
    copyTitle: "Kopiuj adres",
    quick: "Szybkie przejście:",
  },
  en: {
    topics: ["Small fix", "New tool", "App", "Integration", "Automation", "Something else"],
    copied: "Address copied",
    copyFailed: "Couldn’t copy. Select the address manually.",
    title: "Tell me what you want to build.",
    lead: "A few sentences are enough. I’ll reply with questions or straight away with a proposal.",
    topic: "What is it about?",
    send: "Send an email",
    copyLabel: "Copy email address",
    copyTitle: "Copy address",
    quick: "Quick jump:",
  },
}

export async function copyEmail(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(EMAIL)
    return true
  } catch {
    return false
  }
}

export function Contact() {
  const t = useCopy(COPY)
  const [topic, setTopic] = useState(t.topics[0])
  const [status, setStatus] = useState("")
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const mod = useModKey()

  async function copy() {
    const ok = await copyEmail()
    const text = ok ? t.copied : t.copyFailed
    setStatus(text)
    setCopied(ok)
    if (ok) toast.success(text, { description: EMAIL })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => (setStatus(""), setCopied(false)), 2600)
  }
  useCommand("contact:copy", copy)

  return (
    <section id="kontakt" aria-labelledby="ct-h" data-tone="dark" className="dark overflow-clip bg-background pt-[clamp(96px,12vw,168px)] text-foreground">
      <div className="wrap">
        <div className="grid items-end gap-x-16 gap-y-10 min-[901px]:grid-cols-[1fr_1.05fr]">
          <div>
            <h2 id="ct-h" className="display text-[clamp(40px,6.4vw,96px)] leading-none tracking-[-0.042em]">
              {t.title}
            </h2>
            <p className="mt-5 max-w-[34ch] text-[clamp(19px,1.6vw,22px)] text-muted-foreground">
              {t.lead}
            </p>
            <SocialLinks github={LINKS.github} x={LINKS.x} className="mt-8 flex gap-2" />
          </div>

          {/* one card: pick a topic, send, or copy the address */}
          <div className="@container rounded-scene bg-surface p-[clamp(22px,3vw,36px)] ring-1 ring-white/8">
            <fieldset className="border-0 p-0">
              <legend className="mb-3.5 p-0 text-[15px] text-muted-foreground">{t.topic}</legend>
              <ToggleGroup spacing={2} value={[topic]} onValueChange={([v]) => v && setTopic(v)} className="grid w-full grid-cols-2 gap-2 @md:grid-cols-3">
                {t.topics.map((name) => (
                  <ToggleGroupItem
                    key={name}
                    value={name}
                    className="h-11 w-full rounded-[14px] bg-white/8 px-3 text-[15px] font-normal hover:bg-white/14 aria-pressed:bg-foreground aria-pressed:text-black"
                  >
                    {name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </fieldset>
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-white/8 pt-7">
              <a
                id="send"
                href={`mailto:${EMAIL}?subject=${encodeURIComponent(topic)}`}
                className={cn(
                  buttonVariants({
                    size: "lg",
                  }),
                  "h-12 rounded-full px-6 text-[17px] hover:bg-[#7cc0ff] has-data-[icon=inline-start]:pl-[22px]"
                )}
              >
                <MailIcon data-icon="inline-start" />
                {t.send}
              </a>
              <span className="inline-flex min-w-0 items-center gap-1 text-[17px]">
                <a href={`mailto:${EMAIL}`} className="truncate no-underline hover:text-primary">
                  {EMAIL}
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t.copyLabel}
                  title={t.copyTitle}
                  className="rounded-full text-muted-foreground hover:bg-white/10"
                  onClick={copy}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </Button>
              </span>
              <span aria-live="polite" className="sr-only">
                {status}
              </span>
            </div>
          </div>
        </div>

        <p
          aria-hidden
          className="mt-[clamp(80px,10vw,140px)] font-heading text-[min(12.9vw,190px)] leading-[0.8] font-bold tracking-[-0.055em] whitespace-nowrap"
        >
          Maciej Włodarski
        </p>
        <footer className="flex flex-wrap justify-between gap-x-6 gap-y-2 pt-[22px] pb-[26px] text-sm text-muted-foreground">
          <span>© 2026 Maciej Włodarski</span>
          <span>
            {t.quick} {mod}
          </span>
        </footer>
      </div>
    </section>
  )
}
