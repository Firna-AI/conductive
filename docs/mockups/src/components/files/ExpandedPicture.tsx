import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '../../../../../src/ui/components/common/actions'
import { classes } from '../../../../../src/ui/components/common/classes'
import { ScreenLink } from '../common/ScreenLink'
import styles from '../../../../../src/ui/components/tools/ExpandedPreview.module.css'
import { pictureCopy } from '../../../../../src/ui/components/files/pictureCopy'

/**
 * The picture of an image file in a large window over the whole app, after
 * a press on Expand on desktop. It is the window of an expanded preview:
 * the header names the file and holds Close, and the picture shows over
 * its zoom bar, without Expand. The picture fits the window as it opens.
 * Close, Escape, and a press on the dim layer close the window, and the
 * picture stays in its tab.
 */
export function ExpandedPicture(props: {
  /** The name of the image file. */
  title: string
  /** The screen that Close shows: the tab under the window. */
  closeTo: string
  /** The picture, with its zoom bar. */
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
          <ScreenLink asChild to={props.closeTo}>
            <IconButton icon={X} label={pictureCopy.close} />
          </ScreenLink>
        </div>
        {props.children}
      </section>
    </div>
  )
}
