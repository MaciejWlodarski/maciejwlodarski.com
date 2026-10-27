import { StrictMode, startTransition } from "react"
import { hydrateRoot } from "react-dom/client"
import { StartClient } from "@tanstack/react-start/client"

/*
 * Same as the default Start entry, plus a dev warning for hydration mismatches.
 * Redact reports them only through onRecoverableError and then re-renders the
 * whole page, which shows up as a flash and replayed entrance animations.
 */
startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
    import.meta.env.DEV ? { onRecoverableError: (error, info) => console.warn("Hydration failed:", error, info?.componentStack) } : undefined
  )
})
