import { ChevronDown, Menu as MenuIcon } from 'lucide-react'
import type { DocsGuideKey } from './docsGuides'
import { DocsNav } from './DocsNav'
import styles from './DocsMenu.module.css'

/**
 * The docs menu of a phone: a bar under the header of the site that opens
 * the guides in place and pushes the page down. It is a native disclosure,
 * so it opens and closes without a script.
 */
export function DocsMenu(props: { current: DocsGuideKey; open: boolean }) {
  return (
    <details className={styles.menu} open={props.open}>
      <summary className={styles.summary}>
        <MenuIcon aria-hidden className={styles.icon} size={16} />
        Docs menu
        <ChevronDown aria-hidden className={styles.chevron} size={16} />
      </summary>
      <div className={styles.panel}>
        <DocsNav current={props.current} />
      </div>
    </details>
  )
}
