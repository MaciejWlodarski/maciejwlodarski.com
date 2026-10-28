import { defineConfig } from "vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { redact } from "@tanstack/redact/vite"

// TanStack Redact replaces react/react-dom at build time. REDACT=0 builds with
// upstream React so both runtimes can be compared.
const useRedact = process.env.REDACT !== "0"

export default defineConfig({
  resolve: { tsconfigPaths: true },
  // Bundle server deps so the Redact alias also reaches react-dom/server
  // inside @tanstack/react-start; externalised deps would load real React.
  ssr: useRedact ? { noExternal: true } : undefined,
  plugins: [
    ...(useRedact ? [redact()] : []),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})
