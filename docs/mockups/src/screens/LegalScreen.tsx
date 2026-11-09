import type { Viewport } from '@mokly/mokly'
import { privacyDocument } from '../../../../src/marketing/privacy'
import { termsDocument } from '../../../../src/marketing/terms'
import { LegalDocumentView } from '../components/marketing/LegalDocumentView'
import { SitePage } from '../components/marketing/SitePage'

/** The legal pages of the site. */
const documents = { terms: termsDocument, privacy: privacyDocument } as const

/**
 * A legal page of the marketing site: the terms or the privacy notice.
 * The text comes from the documents that the site serves, so the mockup
 * and the site show the same words.
 */
export function LegalScreen(props: {
  page: keyof typeof documents
  viewport: Viewport
}) {
  return (
    <SitePage viewport={props.viewport}>
      <LegalDocumentView
        document={documents[props.page]}
        viewport={props.viewport}
      />
    </SitePage>
  )
}
