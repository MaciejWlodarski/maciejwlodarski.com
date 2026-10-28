import { BurrowScene } from "@/components/site/burrow-scene"
import { CommandPalette } from "@/components/site/command-palette"
import { Contact } from "@/components/site/contact"
import { CrystalScene } from "@/components/site/crystal-scene"
import { DataLab } from "@/components/site/data-lab"
import { Hero } from "@/components/site/hero"
import { About, Projects, Services } from "@/components/site/sections"
import { SiteHeader } from "@/components/site/site-header"
import { useReveal } from "@/hooks/use-scene"
import { HOME, LANGS, LangProvider, type Lang } from "@/lib/i18n"

export const SITE = "https://maciejwlodarski.com"

export const META: Record<Lang, { title: string; description: string; locale: string; imageAlt: string }> = {
  pl: {
    title: "Maciej Włodarski: aplikacje i narzędzia",
    description: "Aplikacje, narzędzia i integracje. Tworzę rozwiązania webowe i desktopowe, automatyzacje z AI oraz interaktywne wizualizacje danych.",
    locale: "pl_PL",
    imageAlt: "Maciej Włodarski: zamieniam pomysły w aplikacje, narzędzia, integracje i automatyzacje.",
  },
  en: {
    title: "Maciej Włodarski: apps and tools",
    description: "Apps, tools and integrations. I build web and desktop software, AI-powered automations and interactive data visualisations.",
    locale: "en_US",
    imageAlt: "Maciej Włodarski: I turn ideas into apps, tools, integrations and automations.",
  },
}

/** head() for a language's home route: title, description, canonical and hreflang alternates */
export function pageHead(lang: Lang) {
  const m = META[lang]
  return {
    meta: [
      { title: m.title },
      { name: "description", content: m.description },
      { property: "og:title", content: m.title },
      { property: "og:description", content: m.description },
      { property: "og:locale", content: m.locale },
      { property: "og:url", content: SITE + HOME[lang] },
      { property: "og:image", content: `${SITE}/og-${lang}.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: m.imageAlt },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: `${SITE}/og-${lang}.png` },
    ],
    links: [
      { rel: "canonical", href: SITE + HOME[lang] },
      ...LANGS.map((l) => ({ rel: "alternate", hrefLang: l, href: SITE + HOME[l] })),
      { rel: "alternate", hrefLang: "x-default", href: SITE + HOME.pl },
    ],
  }
}

const SKIP: Record<Lang, string> = { pl: "Przejdź do treści", en: "Skip to content" }

export function Page({ lang }: { lang: Lang }) {
  useReveal()
  return (
    <LangProvider lang={lang}>
      <a href="#tresc" className="absolute -top-16 left-3 z-50 rounded-full bg-foreground px-4 py-2.5 text-background no-underline focus:top-3">
        {SKIP[lang]}
      </a>
      <SiteHeader />
      <main id="tresc">
        <Hero />
        <CrystalScene />
        <Services />
        <DataLab />
        <BurrowScene />
        <Projects />
        <About />
        <Contact />
      </main>
      <CommandPalette />
    </LangProvider>
  )
}
