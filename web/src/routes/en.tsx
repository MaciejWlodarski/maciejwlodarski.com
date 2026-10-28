import { createFileRoute } from "@tanstack/react-router"

import { Page, pageHead } from "@/components/site/page"

export const Route = createFileRoute("/en")({ head: () => pageHead("en"), component: () => <Page lang="en" /> })
