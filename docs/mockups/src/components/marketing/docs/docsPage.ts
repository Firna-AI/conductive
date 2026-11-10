import type { ReactNode } from 'react'
import type { DocsGuideKey } from './docsGuides'

/**
 * A heading at level two of a page body: the ID of the heading, and its
 * words. The contents of the page link to each one.
 */
export type DocsSection = { id: string; title: string }

/**
 * A page of the docs: its guide, which gives the title and the group, the
 * lead under the title, the headings of its body in their order, and the
 * body. The body starts at heading level two, as the Markdown of a guide
 * does.
 */
export type DocsPage = {
  guide: DocsGuideKey
  lead: string
  sections: readonly DocsSection[]
  body: ReactNode
}
