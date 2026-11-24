import type { Viewport } from '@mokly/mokly'
import { privacyDocument } from '../../../../../src/marketing/privacy'
import { termsDocument } from '../../../../../src/marketing/terms'
import { LegalDocumentView } from '../marketing/LegalDocumentView'
import styles from './AppLegalPage.module.css'

/** The legal documents that the site serves. */
const documents = { terms: termsDocument, privacy: privacyDocument } as const

/**
 * A legal page of the app host, as the in-app browser of a phone app shows
 * it: the shared legal text of the site, with no header or footer of the
 * site and no wordmark link. The text scrolls in the page of the browser.
 */
export function AppLegalPage(props: {
  page: keyof typeof documents
  viewport: Viewport
}) {
  return (
    <div className={styles.page} data-mokly-scroll="app-legal-page">
      <LegalDocumentView
        document={documents[props.page]}
        viewport={props.viewport}
      />
    </div>
  )
}
