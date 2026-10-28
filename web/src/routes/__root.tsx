import { HeadContent, Scripts, createRootRoute, useRouterState } from "@tanstack/react-router"

import { Toaster } from "@/components/ui/sonner"
import { HOME, langOfPath } from "@/lib/i18n"
import appCss from "../styles.css?url"

// title, description and og:locale come from each language's route (components/site/page.tsx)
const ICON_V = 3

// Runs before first paint: the same rule as useSceneMode, so pinned scenes
// get their tall layout without a jump on hydration.
const MODE_SCRIPT = `(function(){var d=document.documentElement;d.setAttribute('data-js','');var r=matchMedia('(prefers-reduced-motion: reduce)').matches;if(!r&&innerHeight>=460&&innerWidth>=320)d.setAttribute('data-pin','')})()`

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light" },
      { name: "theme-color", content: "#f5f5f7" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // bump ICON_V after changing the icons: browsers cache favicons separately and hold on to them
      { rel: "icon", type: "image/svg+xml", href: `/favicon.svg?v=${ICON_V}` },
      { rel: "icon", sizes: "48x48", href: `/favicon.ico?v=${ICON_V}` },
      { rel: "apple-touch-icon", sizes: "180x180", href: `/apple-touch-icon.png?v=${ICON_V}` },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preload", as: "image", href: "/assets/burrow-light.png" },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

const NOT_FOUND = {
  pl: { title: "Nie ma takiej strony.", home: "Wróć na stronę główną" },
  en: { title: "Page not found.", home: "Back to home" },
}

function NotFound() {
  const lang = langOfPath(useRouterState({ select: (s) => s.location.pathname }))
  const t = NOT_FOUND[lang]
  return (
    <main className="wrap py-24">
      <h1 className="display text-5xl">{t.title}</h1>
      <p className="mt-4">
        <a className="text-link" href={HOME[lang]}>
          {t.home}
        </a>
      </p>
    </main>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const lang = langOfPath(useRouterState({ select: (s) => s.location.pathname }))
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster position="bottom-center" />
        <Scripts />
      </body>
    </html>
  )
}
