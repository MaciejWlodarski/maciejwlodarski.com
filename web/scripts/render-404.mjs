// Prerender skips non-200 pages, so render the per-language 404s from the
// SSR build for nginx's error_page.
import { mkdir, writeFile } from "node:fs/promises"

const { default: server } = await import("../dist/server/server.js")
for (const [path, file] of [["/404", "404.html"], ["/en/404", "en/404.html"]]) {
  const res = await server.fetch(new Request(`http://localhost${path}`))
  if (res.status !== 404) throw new Error(`${path}: expected 404, got ${res.status}`)
  await mkdir(new URL(`../dist/client/${file}/..`, import.meta.url), { recursive: true })
  await writeFile(new URL(`../dist/client/${file}`, import.meta.url), await res.text())
}
