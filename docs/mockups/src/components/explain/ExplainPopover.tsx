import type { ReactNode } from 'react'
import type { Viewport } from '../../../../../src/ui/components/common/viewport'
import { Maximize2, X } from 'lucide-react'
import { IconButton } from '../../../../../src/ui/components/common/actions'
import { classes } from '../../../../../src/ui/components/common/classes'
import { Linked } from '../common/ScreenLink'
import sheet from '../../../../../src/ui/components/common/Sheet.module.css'
import {
  closeLabel,
  expandLabel,
} from '../../../../../src/ui/components/explain/explainCopy'
import styles from '../../../../../src/ui/components/explain/ExplainPopover.module.css'
import { popoverSizeStyle } from '../../../../../src/ui/components/explain/popoverSize'
import { PopoverResize, type ResizedPanel } from './PopoverResize'

/**
 * The height of the sheet of a phone: half the screen, as it opens, or the
 * full height, after a drag of its handle.
 */
export type SheetHeight = 'half' | 'full'

/**
 * The top of the popover: the quote that it explains, then Expand and the
 * close button. The quote keeps to two lines, and its title holds all of
 * it. The popover shows no written prompt, so the quote names what the
 * chat under it is about.
 */
function Header(props: { quote: string; expandTo?: string; closeTo?: string }) {
  return (
    <div className={styles.header}>
      <p className={styles.quote} title={props.quote}>
        “{props.quote}”
      </p>
      <Linked to={props.expandTo}>
        <IconButton icon={Maximize2} label={expandLabel} />
      </Linked>
      <Linked to={props.closeTo}>
        <IconButton icon={X} label={closeLabel} />
      </Linked>
    </div>
  )
}

/**
 * The popover of an explanation, drawn open. On a computer it is a small
 * panel by its mark: below the mark, or above it when the screen has more
 * room there, with a width and a highest height. Handles on its free edges
 * change its size. On a phone it is a sheet at half the height of the
 * screen, which a drag of its handle takes to full height. The parent chat
 * stays live around it, so no dim lies over the app. `children` is the
 * chat of the explanation without its written prompt, with the follow-up
 * field at its foot. Expand shows the tab of the explanation, and the
 * close button leaves the mark with the state of the explanation.
 */
export function ExplainPopover(props: {
  /** The title of the explanation, which names the popover. */
  title: string
  quote: string
  viewport: Viewport
  /** The height of the sheet of a phone. */
  height?: SheetHeight
  /**
   * The size that the member chose with the handles of a computer, and the
   * handle that holds the focus. Without it the panel has its default size.
   */
  resized?: ResizedPanel
  /** The screen that Expand shows, when the mockups draw it. */
  expandTo?: string
  /** The screen that the close button shows, when the mockups draw it. */
  closeTo?: string
  children: ReactNode
}) {
  const header = (
    <Header
      closeTo={props.closeTo}
      expandTo={props.expandTo}
      quote={props.quote}
    />
  )
  const body = <div className={styles.body}>{props.children}</div>
  if (props.viewport === 'mobile') {
    const full = props.height === 'full'
    return (
      <section
        aria-label={props.title}
        className={classes(styles.sheet, full && styles.full)}
        role="dialog"
      >
        <span aria-hidden className={sheet.handle} />
        {header}
        {body}
      </section>
    )
  }
  const { resized } = props
  return (
    <section
      aria-label={props.title}
      className={classes(styles.panel, resized && styles.fixedHeight)}
      role="dialog"
      style={resized ? popoverSizeStyle(resized) : undefined}
    >
      {header}
      {body}
      <PopoverResize resized={resized} />
    </section>
  )
}
