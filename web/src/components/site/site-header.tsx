import { useEffect, useState } from "react"
import { SearchIcon } from "lucide-react"
import { cn } from "cn"

import { buttonVariants } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { emit } from "@/lib/commands"
import { useScrollFrame } from "@/hooks/use-scene"
import { HOME, useCopy, type Lang } from "@/lib/i18n"

const COPY = {
  pl: {
    nav: [
      ["#demo-3d", "Demo 3D"],
      ["#dane", "Dane"],
      ["#projekty", "Projekty"],
      ["#o-mnie", "O mnie"],
    ],
    navLabel: "Główna",
    search: "Szukaj",
    searchLabel: (key: string) => `Szukaj na stronie (${key})`,
    write: "Napisz",
    writeShort: "Napisz",
    other: { code: "EN", label: "English version", lang: "en" as Lang },
  },
  en: {
    nav: [
      ["#demo-3d", "3D demo"],
      ["#dane", "Data"],
      ["#projekty", "Projects"],
      ["#o-mnie", "About"],
    ],
    navLabel: "Main navigation",
    search: "Search",
    searchLabel: (key: string) => `Search this site (${key})`,
    write: "Get in touch",
    writeShort: "Contact",
    other: { code: "PL", label: "Wersja polska", lang: "pl" as Lang },
  },
}

/** "⌘K" on Apple devices, "Ctrl K" elsewhere; settles after hydration. */
export function useModKey() {
  const [key, setKey] = useState("⌘K")
  useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) setKey("Ctrl K")
  }, [])
  return key
}

export function SiteHeader() {
  const [dark, setDark] = useState(false)
  const mod = useModKey()
  const t = useCopy(COPY)

  // the bar turns dark while it floats over a dark stage
  useScrollFrame(() => {
    const y = 26
    const over = (el: Element | null) => {
      if (!el) return false
      const r = el.getBoundingClientRect()
      return r.top <= y && r.bottom > y
    }
    setDark(over(document.querySelector("[data-stage]")) || over(document.getElementById("kontakt")))
  })

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-[52px] backdrop-blur-[20px] backdrop-saturate-180 transition-colors duration-300",
        dark ? "dark bg-[rgb(10_10_12/0.72)] text-foreground" : "bg-[rgb(245_245_247/0.78)]"
      )}
    >
      <div className="wrap flex h-full items-center gap-6 max-sm:gap-2.5">
        <a href="#top" className="mr-auto text-[17px] font-semibold tracking-[-0.01em] whitespace-nowrap no-underline max-[380px]:text-[15px]">
          Maciej Włodarski
        </a>
        <nav aria-label={t.navLabel} className="flex items-center gap-[26px] text-sm max-sm:gap-2.5 max-[380px]:gap-1">
          {t.nav.map(([href, label]) => (
            <a key={href} href={href} className="no-underline opacity-85 hover:opacity-100 max-[1100px]:hidden">
              {label}
            </a>
          ))}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={t.searchLabel(mod === "⌘K" ? "Command K" : "Ctrl K")}
            onClick={() => emit("palette:open")}
            className="inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-full bg-foreground/7 pr-2 pl-[11px] text-sm transition-colors hover:bg-foreground/12 max-sm:w-[38px] max-sm:justify-center max-sm:p-0 dark:bg-white/12"
          >
            <SearchIcon aria-hidden className="size-[15px]" />
            <span className="max-sm:hidden">{t.search}</span>
            <Kbd className="max-sm:hidden">{mod}</Kbd>
          </button>
          <a
            href={HOME[t.other.lang]}
            hrefLang={t.other.lang}
            lang={t.other.lang}
            aria-label={t.other.label}
            title={t.other.label}
            className="grid h-[34px] min-w-[34px] place-items-center rounded-full text-[13px] font-semibold tracking-[0.02em] no-underline opacity-85 transition-colors hover:bg-foreground/7 hover:opacity-100 dark:hover:bg-white/12"
          >
            {t.other.code}
          </a>
          <a href="#kontakt" className={cn(buttonVariants({ size: "sm" }), "h-[34px] rounded-full px-[15px] whitespace-nowrap max-[380px]:px-2.5")}>
            <span className="max-[380px]:hidden">{t.write}</span>
            <span className="hidden max-[380px]:inline">{t.writeShort}</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
