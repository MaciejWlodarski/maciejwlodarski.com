import { useEffect, useRef } from "react"
import { ArrowRightIcon, ArrowUpIcon } from "lucide-react"
import { cn } from "cn"

import { buttonVariants } from "@/components/ui/button"
import { LINKS } from "@/lib/motion"
import { useSceneMode } from "@/hooks/use-scene"
import { McpmTerminal } from "@/components/site/mcpm-terminal"
import { MusicCard } from "@/components/site/music-card"
import { useCopy } from "@/lib/i18n"

function SecHead({ id, title, children, className }: { id: string; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div data-reveal className={className}>
      <h2 id={id} className="display text-[clamp(36px,5vw,72px)]">
        {title}
      </h2>
      <p className="mt-5 max-w-[40ch] text-[clamp(19px,1.6vw,22px)] leading-[1.45]">{children}</p>
    </div>
  )
}

const COPY = {
  pl: {
    doTitle: "Co mogę zrobić",
    doLead: "Zaczynam od jednej rzeczy, która ma działać: interfejsu, serwera, integracji albo skryptu, czyli tego, czego akurat brakuje.",
    areas: [
      ["Aplikacje web", "Panele, sklepy i narzędzia w przeglądarce, razem z serwerem.", "STUDIO 3D, Gwar"],
      ["Desktop i CLI", "Natywnie na macOS albo na kilka systemów. Do tego narzędzia wiersza poleceń.", "Burrow, Lumina, mcpm"],
      ["Integracje", "Sklep, magazyn, API i arkusze połączone tak, żeby nikt nie przepisywał danych.", "STUDIO 3D"],
      ["AI i automatyzacje", "Powtarzalna praca na plikach, opisach i zestawieniach. Z modelami AI tam, gdzie mają sens.", ""],
      ["Dane", "Zbieram, czyszczę i pokazuję dane tak, żeby dało się je szybko porównać.", ""],
      ["3D", "Podgląd w przeglądarce, chmury punktów, pliki gotowe do produkcji.", "Lumina, STUDIO 3D"],
    ],
    examples: (ex: string) => ` Przykłady: ${ex}.`,
    ask: "Może to być jedna poprawka, całe narzędzie albo dłuższa współpraca.",
    askCta: "Opisz, czego potrzebujesz",
    projTitle: "Więcej projektów",
    projLead: "Własne aplikacje i praca dla STUDIO 3D. Część kodu jest publiczna na GitHubie.",
    stTitle: "Od zdjęcia do gotowego produktu",
    stBy: "STUDIO 3D i Lumina",
    stBody:
      "Sklep z personalizacją dla STUDIO 3D: klient wgrywa zdjęcie, od razu widzi podgląd 3D swojego produktu, a zamówienie trafia do systemu sklepu bez przepisywania. Pod spodem pracuje Lumina, która zamienia zdjęcie albo model w punkty, układa je w bryle i przygotowuje plik do produkcji.",
    chainLabel: "Droga od zdjęcia do zamówienia",
    chain: [
      ["Zdjęcie lub model", "Lumina"],
      ["Chmura punktów", "Lumina"],
      ["Układ w bryle", "Lumina"],
      ["Podgląd 3D w sklepie", "STUDIO 3D"],
      ["Zamówienie w systemie sklepu", "sklep"],
    ],
    stDemo: "Zobacz zasadę w demo 3D",
    gwSub: "Komunikator głosowy na własny serwer. Rust, web, desktop.",
    gwQuote: "„Zacząłem go, bo TeamSpeak rozwijał się dla mnie za wolno, a Discord nie pozwala postawić własnego serwera.”",
    gwNote: "Rozwijam zgodność z klientami TeamSpeaka, żeby nie trzeba było od razu zmieniać programu.",
    code: "Kod na GitHubie",
    map: {
      label: "Schemat: twój serwer w Rust połączony z przeglądarką, aplikacją desktop i klientem TeamSpeak.",
      browser: "Przeglądarka",
      desktop: "Desktop",
      ts: "Klient TeamSpeak",
      your: "Twój",
      server: "serwer",
    },
    mcSub: "Menedżer modów i launcher do Minecrafta. TypeScript, CLI.",
    mcBody:
      "Instaluje mody z Modrinth razem z zależnościami, trzyma każdy profil osobno, z własnymi zapisami i ustawieniami, a potem uruchamia grę bez oficjalnego launchera. Logowanie kontem Microsoft, z tokenem chronionym przez system: Keychain na macOS, DPAPI na Windows.",
    photo: "Miejsce na zdjęcie Macieja",
    about1:
      "Najbardziej lubię miejsca, w których jeden system musi dogadać się z drugim: sklep z magazynem, model 3D z plikiem do produkcji, człowiek z arkuszem, który od lat wypełnia ręcznie. Tam zwykle ginie najwięcej czasu.",
    about2:
      "Piszę aplikacje natywne na macOS i do przeglądarki oraz serwery w Rust, bo technologię dobieram do problemu. Po godzinach analizuję mecze esportowe: najpierw trzeba zrozumieć dane, dopiero potem da się je komuś pokazać. Z projektami jest tak samo, a na końcu ma zostać coś, co działa beze mnie.",
  },
  en: {
    doTitle: "What I can do",
    doLead: "I start with one thing that needs to work: an interface, a server, an integration or a script, whatever is missing.",
    areas: [
      ["Web apps", "Dashboards, shops and browser tools, with the server behind them.", "STUDIO 3D, Gwar"],
      ["Desktop and CLI", "Native on macOS or across platforms, plus command-line tools.", "Burrow, Lumina, mcpm"],
      ["Integrations", "Shops, inventory, APIs and spreadsheets connected so no one has to re-enter data.", "STUDIO 3D"],
      ["AI and automation", "Repetitive work with files, product descriptions and reports, with AI models where they make sense.", ""],
      ["Data", "I collect, clean and present data so it’s quick to compare.", ""],
      ["3D", "Browser previews, point clouds and production-ready files.", "Lumina, STUDIO 3D"],
    ],
    examples: (ex: string) => ` Examples: ${ex}.`,
    ask: "It can be one fix, a complete tool or a longer collaboration.",
    askCta: "Tell me what you need",
    projTitle: "More projects",
    projLead: "My own apps and work for STUDIO 3D. Some of the code is public on GitHub.",
    stTitle: "From a photo to a finished product",
    stBy: "STUDIO 3D and Lumina",
    stBody:
      "A personalised-product shop for STUDIO 3D: the customer uploads a photo, sees a 3D preview of their product right away, and the order lands in the shop system with nothing retyped. Underneath runs Lumina, which turns a photo or model into points, arranges them inside a solid and prepares the production file.",
    chainLabel: "From photo to order",
    chain: [
      ["Photo or model", "Lumina"],
      ["Point cloud", "Lumina"],
      ["Arranged in a solid", "Lumina"],
      ["3D preview in the shop", "STUDIO 3D"],
      ["Order in the shop system", "shop"],
    ],
    stDemo: "See the idea in the 3D demo",
    gwSub: "Voice chat for your own server. Rust, web, desktop.",
    gwQuote: "“I started it because TeamSpeak was moving too slowly for me, and Discord won’t let you run your own server.”",
    gwNote: "I’m working on compatibility with TeamSpeak clients, so people don’t have to switch apps right away.",
    code: "Code on GitHub",
    map: {
      label: "Diagram: your Rust server connected to a browser, a desktop app and a TeamSpeak client.",
      browser: "Browser",
      desktop: "Desktop",
      ts: "TeamSpeak client",
      your: "Your",
      server: "server",
    },
    mcSub: "A mod manager and launcher for Minecraft. TypeScript, CLI.",
    mcBody:
      "It installs mods from Modrinth with their dependencies, keeps every profile separate with its own saves and settings, and launches the game without the official launcher. Sign-in with a Microsoft account, with the token protected by the system: Keychain on macOS, DPAPI on Windows.",
    photo: "Placeholder for Maciej’s photo",
    about1:
      "I’m drawn to the places where one system has to get along with another: a shop with its warehouse, a 3D model with a production file, a person with the spreadsheet they’ve been filling in by hand for years. That’s usually where most of the time goes.",
    about2:
      "I build native macOS apps, browser apps and servers in Rust, because I pick the technology to fit the problem. In my spare time I analyse esports matches: you have to understand the data before you can show it to anyone. Projects work the same way, and what’s left at the end should keep running without me.",
  },
}

export function Services() {
  const t = useCopy(COPY)
  return (
    <section id="co-robie" aria-labelledby="do-h" className="py-[clamp(80px,9.5vw,140px)]">
      <div className="wrap grid items-start gap-x-[72px] gap-y-12 min-[901px]:grid-cols-[0.9fr_1.4fr]">
        <SecHead id="do-h" title={t.doTitle} className="min-[901px]:sticky min-[901px]:top-[100px]">
          {t.doLead}
        </SecHead>
        <ul className="grid gap-x-14 gap-y-[52px] pt-2 sm:grid-cols-2">
          {t.areas.map(([title, body, ex]) => (
            <li key={title} data-reveal className="flex flex-col">
              <h3 className="display text-[clamp(26px,2.3vw,34px)] leading-[1.1] tracking-[-0.03em]">{title}</h3>
              <p className="mt-2.5 max-w-[34ch] text-lg leading-[1.45]">
                {body}
                {ex && <span className="text-muted-foreground">{t.examples(ex)}</span>}
              </p>
            </li>
          ))}
          <li
            data-reveal
            className="mt-2 flex flex-wrap items-center justify-between gap-x-5 gap-y-4 rounded-full bg-foreground py-[22px] pr-[22px] pl-[30px] text-background max-sm:rounded-scene max-sm:p-6 sm:col-span-2"
          >
            <p className="text-[19px] font-medium">{t.ask}</p>
            <a
              href="#kontakt"
              className={cn(buttonVariants({ size: "sm" }), "h-[34px] rounded-full bg-background px-[15px] text-foreground hover:bg-background/85")}
            >
              {t.askCta}
            </a>
          </li>
        </ul>
      </div>
    </section>
  )
}

function GwarMap() {
  const ref = useRef<SVGSVGElement>(null)
  const { reduce } = useSceneMode()
  const t = useCopy(COPY).map
  // SMIL signals only run while the diagram is on screen
  useEffect(() => {
    const svg = ref.current!
    const play = (on: boolean) => (on && !reduce ? svg.unpauseAnimations() : svg.pauseAnimations())
    play(false)
    const io = new IntersectionObserver((es) => play(es[0].isIntersecting && !document.hidden))
    io.observe(svg)
    return () => io.disconnect()
  }, [reduce])
  const pulse = (path: string, dur: string, begin: string, back: boolean) => (
    <circle r={back ? 3 : 4} className={back ? "fill-foreground" : "fill-primary"}>
      <animateMotion dur={dur} begin={begin} repeatCount="indefinite" {...(back ? {} : { keyPoints: "1;0", keyTimes: "0;1", calcMode: "linear" })}>
        <mpath href={path} />
      </animateMotion>
    </circle>
  )
  return (
    <svg
      ref={ref}
      viewBox="0 0 420 230"
      role="img"
      aria-label={t.label}
      className="-mx-2 mt-[22px] [&_text]:fill-foreground [&_text]:text-[13px]"
    >
      <g className="fill-none stroke-white/18 [stroke-width:1.5]">
        <path id="w1" d="M210 120 C150 120 120 48 70 48" />
        <path id="w2" d="M210 120 C270 120 300 48 350 48" />
        <path id="w3" d="M210 120 L210 196" />
      </g>
      {pulse("#w1", "2.4s", "0s", false)}
      {pulse("#w1", "2.4s", "-1.2s", true)}
      {pulse("#w2", "2.8s", "-0.5s", false)}
      {pulse("#w2", "2.8s", "-1.8s", true)}
      {pulse("#w3", "2s", "-0.9s", false)}
      <g className="fill-[#1c1c1f]">
        <rect x="10" y="26" width="120" height="44" rx="22" />
        <rect x="290" y="26" width="120" height="44" rx="22" />
        <rect x="135" y="178" width="150" height="44" rx="22" />
      </g>
      <text x="70" y="53" className="[text-anchor:middle]">
        {t.browser}
      </text>
      <text x="350" y="53" className="[text-anchor:middle]">
        {t.desktop}
      </text>
      <text x="210" y="205" className="[text-anchor:middle]">
        {t.ts}
      </text>
      <circle cx="210" cy="120" r="30" className="fill-primary" />
      <text x="210" y="116" className="fill-primary-foreground! font-semibold [text-anchor:middle]">
        {t.your}
      </text>
      <text x="210" y="131" className="fill-primary-foreground! font-semibold [text-anchor:middle]">
        {t.server}
      </text>
    </svg>
  )
}

const tile = "relative overflow-clip rounded-scene p-[clamp(26px,3vw,44px)]"
const tileTitle = "display text-[clamp(30px,3.2vw,44px)] leading-[1.05] tracking-[-0.03em]"

export function Projects() {
  const t = useCopy(COPY)
  return (
    <section id="projekty" aria-labelledby="proj-h" className="pt-[clamp(48px,5vw,72px)] pb-[clamp(80px,9.5vw,140px)]">
      <div className="wrap">
        <SecHead id="proj-h" title={t.projTitle}>
          {t.projLead}
        </SecHead>
        <div className="mt-14 grid grid-cols-12 gap-4">
          <article data-reveal aria-labelledby="st-h" className={cn(tile, "col-span-12 bg-surface min-[901px]:col-span-7")}>
            <h3 id="st-h" className={tileTitle}>
              {t.stTitle}
            </h3>
            <p className="mt-1.5 text-[17px] text-muted-foreground">{t.stBy}</p>
            <p className="mt-4 max-w-[52ch] text-[17px]">
              {t.stBody}
            </p>
            <ol aria-label={t.chainLabel} className="mt-[30px] grid gap-2">
              {t.chain.map(([step, who]) => (
                <li key={step} className="flex items-center gap-3.5 rounded-[14px] bg-background px-4 py-3 text-base font-medium">
                  <span aria-hidden className="size-2.5 flex-none rounded-full bg-primary shadow-[0_0_0_4px_rgb(10_102_216/0.18)]" />
                  {step}
                  <small className="ml-auto text-[13px] font-normal text-muted-foreground">{who}</small>
                </li>
              ))}
            </ol>
            <p className="mt-[22px] text-base">
              <a className="text-link" href="#demo-3d">
                {t.stDemo} <ArrowUpIcon aria-hidden className="inline size-4 align-[-3px]" />
              </a>
            </p>
          </article>

          <article data-reveal aria-labelledby="gw-h" className={cn(tile, "dark col-span-12 bg-surface text-foreground min-[901px]:col-span-5")}>
            <h3 id="gw-h" className={tileTitle}>
              Gwar
            </h3>
            <p className="mt-1.5 text-[17px] text-muted-foreground">{t.gwSub}</p>
            <GwarMap />
            <blockquote className="mt-[18px] text-lg leading-[1.45]">
              <p>{t.gwQuote}</p>
            </blockquote>
            <p className="mt-4 text-sm text-muted-foreground">{t.gwNote}</p>
            <p className="mt-[22px] text-base">
              <a className="text-link" href={LINKS.gwar}>
                {t.code} <ArrowRightIcon aria-hidden className="arr inline size-4 align-[-3px]" />
              </a>
            </p>
          </article>

          <article
            data-reveal
            aria-labelledby="mc-h"
            className={cn(tile, "col-span-12 grid items-center gap-x-14 gap-y-8 bg-muted min-[901px]:grid-cols-[1fr_1.1fr]")}
          >
            <div>
              <h3 id="mc-h" className={tileTitle}>
                mcpm
              </h3>
              <p className="mt-1.5 text-[17px] text-muted-foreground">{t.mcSub}</p>
              <p className="mt-4 max-w-[48ch] text-[17px]">
                {t.mcBody}
              </p>
              <p className="mt-[22px] text-base">
                <a className="text-link" href={LINKS.mcpm}>
                  {t.code} <ArrowRightIcon aria-hidden className="arr inline size-4 align-[-3px]" />
                </a>
              </p>
            </div>
            <McpmTerminal />
          </article>
        </div>
      </div>
    </section>
  )
}

export function About() {
  const t = useCopy(COPY)
  return (
    <section id="o-mnie" aria-labelledby="me-h" className="py-[clamp(80px,9.5vw,140px)]">
      {/* photo and text share one height: the photo stretches to the column, the music card closes it at the bottom */}
      <div className="wrap grid gap-x-[clamp(40px,5vw,72px)] gap-y-10 *:min-w-0 min-[901px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div data-reveal="scale" className="max-[900px]:max-w-[360px]">
          <div
            role="img"
            aria-label={t.photo}
            className="grid h-full place-items-center rounded-scene bg-muted max-[900px]:aspect-[4/5] min-[901px]:min-h-[520px]"
          >
            <span className="display text-[clamp(64px,9vw,132px)] tracking-[-0.04em] text-foreground/15">MW</span>
          </div>
        </div>
        <div data-reveal className="flex flex-col">
          <h2 id="me-h" className="display text-[clamp(36px,5vw,72px)]">
            Maciej Włodarski
          </h2>
          <div className="mt-6 max-w-[46ch] space-y-4 text-pretty">
            <p className="text-xl leading-normal">
              {t.about1}
            </p>
            <p className="text-lg leading-normal text-muted-foreground">
              {t.about2}
            </p>
          </div>
          <div className="mt-auto pt-10">
            <MusicCard />
          </div>
        </div>
      </div>
    </section>
  )
}
