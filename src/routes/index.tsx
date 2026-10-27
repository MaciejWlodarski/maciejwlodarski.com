import { createFileRoute } from "@tanstack/react-router"

import { Page, pageHead } from "@/components/site/page"

export const Route = createFileRoute("/")({ head: () => pageHead("pl"), component: () => <Page lang="pl" /> })
