import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '../../../../../src/ui/components/common/actions'
import { classes } from '../../../../../src/ui/components/common/classes'
import { ScreenLink } from '../common/ScreenLink'
import { PreviewActions } from './PortPreview'
import { expandedPreviewCopy } from '../../../../../src/ui/components/tools/previewCopy'
import styles from '../../../../../src/ui/components/tools/ExpandedPreview.module.css'
import page from '../../../../../src/ui/components/tools/PreviewPage.module.css'

/**
 * The page of a Preview tab or of an HTML file in a large window over the
 * whole app, after a press on Expand on desktop. The header names the
 * page, and holds Reload, Open, and Close. Close, Escape, and a press on
 * the dim layer close the window, and the page stays in its tab. The page
 * keeps its state, because the app does not load it again.
 */
export function ExpandedPreview(props: {
  /** The name of the page: the label of the Preview tab, or the file name. */
  title: string
  /** The address that Open opens in a new tab. */
  href: string
  /** The screen that Close shows: the tab under the window. */
  closeTo: string
  children: ReactNode
}) {
  return (
    <div className={classes(styles.layer, styles.inFrame)}>
      <section
        aria-label={props.title}
        aria-modal
        className={styles.window}
        role="dialog"
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{props.title}</h2>
          <PreviewActions href={props.href} />
          <ScreenLink asChild to={props.closeTo}>
            <IconButton icon={X} label={expandedPreviewCopy.close} />
          </ScreenLink>
        </div>
        <div className={page.frame}>{props.children}</div>
      </section>
    </div>
  )
}
