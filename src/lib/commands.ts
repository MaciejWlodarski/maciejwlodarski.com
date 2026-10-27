import { useEffect, useRef } from "react"

/*
 * The command palette steers demos that live in other sections. Each demo
 * registers handlers here instead of lifting all of its state to the page.
 */
export type CommandMap = {
  "crystal:form": "knot" | "text"
  "crystal:stage": 0 | 1 | 2
  "data:set": "shop" | "ads" | "support"
  "palette:open": undefined
  "contact:copy": undefined
}
type Handler<K extends keyof CommandMap> = (arg: CommandMap[K]) => void

const handlers = new Map<keyof CommandMap, Set<Handler<any>>>()

export function emit<K extends keyof CommandMap>(name: K, ...arg: CommandMap[K] extends undefined ? [] : [CommandMap[K]]) {
  handlers.get(name)?.forEach((h) => h(arg[0] as CommandMap[K]))
}

export function useCommand<K extends keyof CommandMap>(name: K, handler: Handler<K>) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const h: Handler<K> = (a) => ref.current(a)
    if (!handlers.has(name)) handlers.set(name, new Set())
    handlers.get(name)!.add(h)
    return () => void handlers.get(name)!.delete(h)
  }, [name])
}
