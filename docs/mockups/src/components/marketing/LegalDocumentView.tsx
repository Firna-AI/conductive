import type { Viewport } from '@mokly/mokly'
import {
  legalLabel,
  type Block,
  type LegalDocument,
} from '../../../../../src/marketing/legal-text'
import { CatalogueText } from './CatalogueText'
import { TextPage } from './TextPage'
import styles from './LegalDocumentView.module.css'

function BlockView(props: { block: Block }) {
  const { block } = props
  if (block.kind === 'paragraph') {
    return (
      <p className={styles.paragraph}>
        <CatalogueText text={block.text} />
      </p>
    )
  }
  return (
    <ul className={styles.list}>
      {block.items.map((item, index) => (
        <li className={styles.item} key={index}>
          <CatalogueText text={item} />
        </li>
      ))}
    </ul>
  )
}

/**
 * A legal page of the site from the same document that the site serves:
 * the title, the introduction, and the sections.
 * Each fact that waits for the operator or the lawyer is marked.
 */
export function LegalDocumentView(props: {
  document: LegalDocument
  viewport: Viewport
}) {
  const { document, viewport } = props
  return (
    <TextPage
      label={legalLabel}
      lead={<CatalogueText text={document.lead} />}
      title={document.title}
      viewport={viewport}
    >
      {document.sections.map((section) => (
        <section className={styles.section} key={section.title}>
          <h2 className={styles.heading}>{section.title}</h2>
          {section.blocks.map((block, index) => (
            <BlockView block={block} key={index} />
          ))}
        </section>
      ))}
    </TextPage>
  )
}
