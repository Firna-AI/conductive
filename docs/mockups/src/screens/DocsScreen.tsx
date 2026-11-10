import type { SchemaProps, Viewport } from '@mokly/mokly'
import { DocsLayout } from '../components/marketing/docs/DocsLayout'
import type { DocsPage } from '../components/marketing/docs/docsPage'
import { SitePage } from '../components/marketing/SitePage'
import { docsGetStartedPage } from './docsGetStarted'
import { docsOverviewPage } from './docsOverview'

export const docsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['page', 'open'],
  properties: {
    /** The page: the overview at `/docs`, or the Get started guide. */
    page: { enum: ['overview', 'get-started'] },
    /**
     * What a phone shows open: nothing, the docs menu, or the contents of
     * the page. A desktop keeps the guides and the contents in view.
     */
    open: { enum: ['none', 'menu', 'contents'] },
  },
} as const

type DocsState = SchemaProps<typeof docsSchema>

/** The pages of the docs that the mockups draw. */
const pages: Readonly<Record<DocsState['page'], DocsPage>> = {
  overview: docsOverviewPage,
  'get-started': docsGetStartedPage,
}

/** The overview at `/docs`, with everything closed on a phone. */
export const docsOverview: DocsState = { page: 'overview', open: 'none' }

/** The Get started guide, with everything closed on a phone. */
export const docsGuide: DocsState = { page: 'get-started', open: 'none' }

/**
 * A page of the public docs: the header and the footer of the site around
 * the docs layout. The header marks Docs as the current section.
 */
export function DocsScreen(props: { state: DocsState; viewport: Viewport }) {
  const { state, viewport } = props
  return (
    <SitePage current="docs" viewport={viewport}>
      <DocsLayout
        open={state.open}
        page={pages[state.page]}
        viewport={viewport}
      />
    </SitePage>
  )
}
