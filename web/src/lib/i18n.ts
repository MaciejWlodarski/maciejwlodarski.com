import { createContext, createElement, useContext } from "react"

/*
 * Two languages, two routes: "/" is Polish, "/en" is English. Copy lives next to
 * the component that shows it, as { pl, en } pairs picked with useLang().
 */
export type Lang = "pl" | "en"
export const LANGS: Lang[] = ["pl", "en"]
export const HOME: Record<Lang, string> = { pl: "/", en: "/en" }

const LangContext = createContext<Lang>("pl")

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return createElement(LangContext.Provider, { value: lang }, children)
}

export const useLang = () => useContext(LangContext)

/** Picks this language's copy out of a { pl, en } table. */
export function useCopy<T>(table: Record<Lang, T>): T {
  return table[useLang()]
}

export const langOfPath = (path: string): Lang => (path === "/en" || path.startsWith("/en/") ? "en" : "pl")
