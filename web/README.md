# maciejwlodarski.com

A personal website and portfolio built with TanStack Start, React, Tailwind CSS,
and shadcn/ui components based on Base UI. Available in Polish (`/`) and English
(`/en`), it combines project stories with an interactive point-cloud demo, a
data explorer, and a command palette.

The data in the explorer is fictional. The optional music section reads its data
from the Spotify feed service in [`../spotify-api`](../spotify-api).

Use Node.js 24 or newer and npm:

```sh
npm ci
npm run dev          # http://localhost:3000
npm run typecheck
npm run build
```

For a build using React DOM instead of the experimental TanStack Redact renderer,
run `REDACT=0 npm run build`.

The music feed defaults to `http://127.0.0.1:8810/spotify/feed` in development
and `https://api.maciejwlodarski.com/spotify/feed` in production. Set
`VITE_MUSIC_FEED` at build time to use another endpoint. When the feed is
unavailable, the site displays a disconnected state.

The Burrow image used on the site is an earlier interface render with synthetic
example files; it is not a current desktop screenshot.

## Notatki techniczne

Strona portfolio: TanStack Start + React 19 + Tailwind v4 + shadcn/ui (styl **Luma**, Base UI),
uruchamiana na **TanStack Redact** zamiast `react-dom`.

```sh
npm install
npm run dev          # http://localhost:3000
npm run build        # dist/ (Redact)
REDACT=0 npm run build   # ten sam build na zwykłym React, do porównania
npx vite preview     # podgląd buildu produkcyjnego
```

## Struktura

- `src/routes/__root.tsx` – wspólne metadane, `<html lang>` z adresu, skrypt trybu scen (`data-pin`) uruchamiany przed pierwszym malowaniem
- `src/routes/index.tsx` (`/`, polski) i `src/routes/en.tsx` (`/en`, angielski) – obie renderują `components/site/page.tsx` (kolejność sekcji, tytuł, opis, canonical, hreflang)
- `src/lib/i18n.ts` – język strony; teksty leżą przy komponentach jako `COPY = { pl, en }` czytane przez `useCopy(COPY)`
- `src/components/site/` – sekcje strony i dema
  - `crystal-scene.tsx` + `src/lib/crystal-engine.ts` – chmura punktów na canvas 2D (model → punkty → bryła)
  - `data-lab.tsx` + `src/lib/datasets.ts` – wykres rozrzutu z wnioskiem liczonym na żywo
  - `burrow-scene.tsx` – Burrow: zrzut z podświetlaniem fragmentów okna
  - `command-palette.tsx` – ⌘K / Ctrl+K / `/`, wyszukiwanie bez polskich znaków
- `src/hooks/use-scene.ts` – tryb scen (przyklejone vs spoczynkowe), wspólna pętla scrolla, wejścia sekcji
- `src/lib/commands.ts` – paleta poleceń steruje demami w innych sekcjach
- `src/components/ui/` – komponenty shadcn (Luma)

Paleta: srebro `#f5f5f7`, tekst `#1d1d1f`, jeden akcent `#0a66d8`, seria B wykresu `#d4570b`;
ciemne sceny przez klasę `.dark` na sekcji (akcent `#4fa8ff`).

## Redact 0.2.1 – co wyszło w praniu

| | React 19.3 | Redact 0.2.1 |
|---|---|---|
| JS klienta (wszystkie chunki, gzip) | ~195 KB | ~147 KB (Radix), ~180 KB po przejściu na Base UI |

Potrzebne obejścia:

1. **SSR**: zależności serwera muszą być zbundlowane (`ssr.noExternal: true` w `vite.config.ts`),
   inaczej `@tanstack/react-start` ładuje prawdziwy `react-dom/server`, a hooki idą przez Redact
   → błąd `getDispatcher` przy renderowaniu.
2. **`useSyncExternalStore`**: Redact nie odczytuje ponownie snapshotu po subskrypcji, więc wartość
   z serwera zostaje. `use-scene.ts` wysyła powiadomienie po subskrypcji.
3. **SVG `textAnchor`** jest renderowany dosłownie (zamiast `text-anchor`), przeglądarka go ignoruje.
   Kotwiczenie tekstu idzie przez CSS (`[text-anchor:middle]`).
4. **Suwaki**: za czasów Radixa kciuk Slidera zostawał `display:none`. Oś czasu używa natywnego
   `input[type=range]` i tak zostaje.
5. **Liczbowe zmienne CSS w `style`**: SSR Redacta dopisuje `px` (`--gap: 2` → `2px`), klient nie.
   Hydracja się nie zgadza i Redact renderuje całą stronę od nowa (mignięcie, animacje startują
   drugi raz). Zmienne CSS przekazujemy jako tekst (`src/components/ui/toggle-group.tsx`).
   `src/client.tsx` wypisuje w dev ostrzeżenie przy każdej nieudanej hydracji.
6. **Liczby zmiennoprzecinkowe w SVG**: Node na serwerze i przeglądarka potrafią się różnić na ostatniej
   cyfrze (`128.0738298290828` kontra `…08274`), a to też psuje hydrację. Współrzędne wykresu
   w `data-lab.tsx` są zaokrąglane do 0,01 px.

Komponenty shadcn na Base UI (Button, ToggleGroup, Select, Tabs, Dialog, cmdk, Sonner) działają pod Redactem.
Różnice względem Radixa, o których łatwo zapomnieć:
- linki wyglądające jak przyciski to zwykłe `<a className={cn(buttonVariants(…), …)}>`; `Button render={<a/>}`
  dokłada `role="button"`,
- ToggleGroup trzyma wartość jako tablicę (`value={[x]}`, `onValueChange={([v]) => …}`),
- stany w klasach: `aria-pressed:` zamiast `data-[state=on]:`, `data-active:` zamiast `data-[state=active]:`,
- Select potrzebuje `items` (wartość → etykieta), inaczej pokazuje surową wartość.
`cmdk` nadal ciągnie kilka małych pakietów `@radix-ui/*` jako własne zależności.
