import { ChevronDown } from 'lucide-react'
import type { DocsSection } from './docsPage'
import styles from './DocsContents.module.css'

function Links(props: { sections: readonly DocsSection[] }) {
  return (
    <ul className={styles.list}>
      {props.sections.map((section) => (
        <li key={section.id}>
          <a className={styles.link} href={`#${section.id}`}>
            {section.title}
          </a>
        </li>
      ))}
    </ul>
  )
}

/**
 * The contents of a page: a link to each heading of its body, which is
 * also where a reader copies the address of a section. A desktop shows a
 * list. A phone shows a native disclosure under the lead, closed at first,
 * which opens without a script.
 */
export function DocsContents(props: {
  sections: readonly DocsSection[]
  layout: 'list' | 'disclosure'
  open?: boolean
}) {
  if (props.layout === 'list') {
    return (
      <nav aria-labelledby="docs-contents" className={styles.contents}>
        <span className={styles.heading} id="docs-contents">
          On this page
        </span>
        <Links sections={props.sections} />
      </nav>
    )
  }
  return (
    <details className={styles.disclosure} open={props.open}>
      <summary className={styles.summary}>
        On this page
        <ChevronDown aria-hidden className={styles.chevron} size={16} />
      </summary>
      <nav aria-label="On this page">
        <Links sections={props.sections} />
      </nav>
    </details>
  )
}
