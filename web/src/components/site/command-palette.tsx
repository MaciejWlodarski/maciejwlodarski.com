import { useEffect, useState } from "react"
import { BoxIcon, ChartScatterIcon, CopyIcon, ExternalLinkIcon, LanguagesIcon, MailIcon, MoveRightIcon } from "lucide-react"

import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { emit, useCommand } from "@/lib/commands"
import { EMAIL, LINKS } from "@/lib/motion"
import { scrollToSection } from "@/hooks/use-scene"
import { HOME, useCopy, useLang, type Lang } from "@/lib/i18n"

type Cmd = { label: string; hint: string; icon: React.ComponentType<{ className?: string }>; run: () => void }

const go = (id: string) => () => scrollToSection(id)
const open = (url: string) => () => (location.href = url)

const sendMail = () => (location.href = (document.getElementById("send") as HTMLAnchorElement).href)

function groups(lang: Lang): [string, Cmd[]][] {
  if (lang === "en")
    return [
      [
        "Go to",
        [
          { label: "3D demo: from model to solid", hint: "section", icon: MoveRightIcon, run: go("demo-3d") },
          { label: "What I can do", hint: "section", icon: MoveRightIcon, run: go("co-robie") },
          { label: "Data: comparison", hint: "section", icon: MoveRightIcon, run: go("dane") },
          { label: "Burrow", hint: "project", icon: MoveRightIcon, run: go("burrow") },
          { label: "More projects: STUDIO 3D, Lumina, Gwar, mcpm", hint: "section", icon: MoveRightIcon, run: go("projekty") },
          { label: "About and music", hint: "section", icon: MoveRightIcon, run: go("o-mnie") },
          { label: "Contact", hint: "section", icon: MoveRightIcon, run: go("kontakt") },
        ],
      ],
      [
        "3D demo",
        [
          { label: "Shape: knot", hint: "shape", icon: BoxIcon, run: () => emit("crystal:form", "knot") },
          { label: "Shape: text", hint: "shape", icon: BoxIcon, run: () => emit("crystal:form", "text") },
          { label: "Show it set in a solid", hint: "stage", icon: BoxIcon, run: () => emit("crystal:stage", 2) },
        ],
      ],
      [
        "Data",
        [
          { label: "Data set: shop", hint: "example", icon: ChartScatterIcon, run: () => emit("data:set", "shop") },
          { label: "Data set: ad campaigns", hint: "example", icon: ChartScatterIcon, run: () => emit("data:set", "ads") },
          { label: "Data set: customer support", hint: "example", icon: ChartScatterIcon, run: () => emit("data:set", "support") },
        ],
      ],
      [
        "Contact",
        [
          { label: "Copy email address", hint: EMAIL, icon: CopyIcon, run: () => emit("contact:copy") },
          { label: "Send an email", hint: "opens your mail app", icon: MailIcon, run: sendMail },
        ],
      ],
      [
        "Links",
        [
          { label: "GitHub", hint: "MaciejWlodarski", icon: ExternalLinkIcon, run: open(LINKS.github) },
          { label: "X", hint: "profile", icon: ExternalLinkIcon, run: open(LINKS.x) },
          { label: "Burrow on GitHub", hint: "code", icon: ExternalLinkIcon, run: open(LINKS.burrow) },
          { label: "Gwar on GitHub", hint: "code", icon: ExternalLinkIcon, run: open(LINKS.gwar) },
          { label: "mcpm on GitHub", hint: "code", icon: ExternalLinkIcon, run: open(LINKS.mcpm) },
          { label: "Wersja polska", hint: "język", icon: LanguagesIcon, run: open(HOME.pl) },
        ],
      ],
    ]
  return [
    [
      "Przejdź",
      [
        { label: "Demo 3D: od modelu do bryły", hint: "sekcja", icon: MoveRightIcon, run: go("demo-3d") },
        { label: "Co mogę zrobić", hint: "sekcja", icon: MoveRightIcon, run: go("co-robie") },
        { label: "Dane: porównanie", hint: "sekcja", icon: MoveRightIcon, run: go("dane") },
        { label: "Burrow", hint: "projekt", icon: MoveRightIcon, run: go("burrow") },
        { label: "Więcej projektów: STUDIO 3D, Lumina, Gwar, mcpm", hint: "sekcja", icon: MoveRightIcon, run: go("projekty") },
        { label: "O mnie i muzyka", hint: "sekcja", icon: MoveRightIcon, run: go("o-mnie") },
        { label: "Kontakt", hint: "sekcja", icon: MoveRightIcon, run: go("kontakt") },
      ],
    ],
    [
      "Demo 3D",
      [
        { label: "Forma: węzeł", hint: "kształt", icon: BoxIcon, run: () => emit("crystal:form", "knot") },
        { label: "Forma: napis", hint: "kształt", icon: BoxIcon, run: () => emit("crystal:form", "text") },
        { label: "Pokaż ułożone w bryle", hint: "etap", icon: BoxIcon, run: () => emit("crystal:stage", 2) },
      ],
    ],
    [
      "Dane",
      [
        { label: "Zbiór: sklep", hint: "przykład", icon: ChartScatterIcon, run: () => emit("data:set", "shop") },
        { label: "Zbiór: kampanie reklamowe", hint: "przykład", icon: ChartScatterIcon, run: () => emit("data:set", "ads") },
        { label: "Zbiór: obsługa klienta", hint: "przykład", icon: ChartScatterIcon, run: () => emit("data:set", "support") },
      ],
    ],
    [
      "Kontakt",
      [
        { label: "Kopiuj adres e-mail", hint: EMAIL, icon: CopyIcon, run: () => emit("contact:copy") },
        { label: "Napisz e-mail", hint: "otwiera program pocztowy", icon: MailIcon, run: sendMail },
      ],
    ],
    [
      "Linki",
      [
        { label: "GitHub", hint: "MaciejWlodarski", icon: ExternalLinkIcon, run: open(LINKS.github) },
        { label: "X", hint: "profil", icon: ExternalLinkIcon, run: open(LINKS.x) },
        { label: "Burrow na GitHubie", hint: "kod", icon: ExternalLinkIcon, run: open(LINKS.burrow) },
        { label: "Gwar na GitHubie", hint: "kod", icon: ExternalLinkIcon, run: open(LINKS.gwar) },
        { label: "mcpm na GitHubie", hint: "kod", icon: ExternalLinkIcon, run: open(LINKS.mcpm) },
        { label: "English version", hint: "language", icon: LanguagesIcon, run: open(HOME.en) },
      ],
    ],
  ]
}

const COPY = {
  pl: {
    title: "Szukaj na stronie",
    description: "Dokąd przejść albo co zrobić",
    placeholder: "Dokąd przejść albo co zrobić?",
    empty: "Nic nie pasuje. Spróbuj „dane”, „bryła” albo „e-mail”.",
    keys: ["wybór", "otwiera", "zamyka"],
  },
  en: {
    title: "Search this site",
    description: "Where to go or what to do",
    placeholder: "Where to go or what to do?",
    empty: "Nothing matches. Try “data”, “solid” or “email”.",
    keys: ["select", "open", "close"],
  },
}

/** "bryla" finds "bryła" */
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")

function filter(value: string, search: string) {
  const t = fold(value), q = fold(search.trim())
  if (!q) return 1
  const at = t.indexOf(q)
  if (at >= 0) return 1 - at / (t.length + 1) / 2
  // loose subsequence match with few gaps
  let j = 0, gaps = 0, last = -1
  for (let k = 0; k < t.length && j < q.length; k++)
    if (t[k] === q[j]) {
      if (last >= 0) gaps += k - last - 1
      last = k
      j++
    }
  return j === q.length && gaps <= 6 ? 0.3 - gaps / 40 : 0
}

export function CommandPalette() {
  const lang = useLang()
  const t = useCopy(COPY)
  const [isOpen, setOpen] = useState(false)
  useCommand("palette:open", () => setOpen(true))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
        return
      }
      const el = e.target as HTMLElement
      const typing = /^(input|textarea|select)$/i.test(el.tagName) || el.isContentEditable
      if (e.key === "/" && !typing) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen} title={t.title} description={t.description} className="sm:max-w-[620px]">
      <Command filter={filter} className="bg-transparent">
        <CommandInput placeholder={t.placeholder} className="h-11 text-base" />
        <CommandList className="max-h-[min(440px,60vh)]">
          <CommandEmpty>{t.empty}</CommandEmpty>
          {groups(lang).map(([heading, items]) => (
            <CommandGroup key={heading} heading={heading}>
              {items.map((c) => (
                <CommandItem
                  key={c.label}
                  value={`${c.label} ${heading}`}
                  onSelect={() => {
                    setOpen(false)
                    // let the dialog release focus and scroll lock first
                    requestAnimationFrame(c.run)
                  }}
                  className="py-2.5 text-[15px]"
                >
                  <c.icon className="text-muted-foreground" />
                  {c.label}
                  <CommandShortcut className="tracking-normal">{c.hint}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
        <div aria-hidden className="flex gap-4 border-t px-4 py-2.5 text-xs text-muted-foreground">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> {t.keys[0]}
          </span>
          <span>
            <Kbd>Enter</Kbd> {t.keys[1]}
          </span>
          <span>
            <Kbd>Esc</Kbd> {t.keys[2]}
          </span>
        </div>
      </Command>
    </CommandDialog>
  )
}
