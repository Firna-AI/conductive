import type { Viewport } from '@mokly/mokly'
import { notFoundText } from '../../../../src/marketing/legal-text'
import { CatalogueText } from '../components/marketing/CatalogueText'
import { SitePage } from '../components/marketing/SitePage'
import { TextPage } from '../components/marketing/TextPage'

/**
 * The page of the marketing site for an address that it does not have. It
 * keeps the header and the footer, so a visitor can go on from there.
 */
export function NotFoundScreen(props: { viewport: Viewport }) {
  return (
    <SitePage viewport={props.viewport}>
      <TextPage
        label={notFoundText.label}
        lead={<CatalogueText text={notFoundText.lead} />}
        title={notFoundText.title}
        viewport={props.viewport}
      />
    </SitePage>
  )
}
