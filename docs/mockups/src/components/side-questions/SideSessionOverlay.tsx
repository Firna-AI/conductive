import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { Maximize2, X } from 'lucide-react'
import { ActionButton, IconButton } from '../common/actions'
import { Linked } from '../common/ScreenLink'
import sheet from '../common/Sheet.module.css'
import { SessionTabIcon } from '../workspace/SessionTabIcon'
import { closeOverlayLabel, openAsTabLabel } from './sideQuestionCopy'
import styles from './SideSessionOverlay.module.css'

/**
 * The header of the overlay: the icon and the title of the session, as its
 * tab shows them, then Open as tab and the close button. A phone shows
 * Open as tab as its icon, so the title keeps its room.
 */
function Header(props: {
  title: string
  running: boolean
  phone: boolean
  openTo?: string
  closeTo?: string
}) {
  return (
    <div className={styles.header}>
      <SessionTabIcon running={props.running} />
      <h2 className={styles.title}>{props.title}</h2>
      <Linked to={props.openTo}>
        {props.phone ? (
          <IconButton icon={Maximize2} label={openAsTabLabel} />
        ) : (
          <ActionButton icon={Maximize2}>{openAsTabLabel}</ActionButton>
        )}
      </Linked>
      <Linked to={props.closeTo}>
        <IconButton icon={X} label={closeOverlayLabel} />
      </Linked>
    </div>
  )
}

/**
 * A side session over the chat of its parent, drawn open: a dialog at the
 * right edge of a computer, over a light dim, so the marked text stays in
 * view beside it, and a sheet on a phone, which stops under the tab row of
 * the workspace. The parent tab stays the shown tab under it.
 * `children` is the chat of the side session, with its composer and Stop,
 * as its tab shows them. Open as tab shows that tab, and the close button
 * goes back to the parent, whose mark keeps the state of the session.
 */
export function SideSessionOverlay(props: {
  title: string
  /** The turn of the session runs, so its icon is the spinner of a tab. */
  running: boolean
  viewport: Viewport
  /** The screen that Open as tab shows, when the mockups draw it. */
  openTo?: string
  /** The screen that the close button shows, when the mockups draw it. */
  closeTo?: string
  children: ReactNode
}) {
  const phone = props.viewport === 'mobile'
  const header = (
    <Header
      closeTo={props.closeTo}
      openTo={props.openTo}
      phone={phone}
      running={props.running}
      title={props.title}
    />
  )
  if (phone) {
    return (
      <div className={sheet.layer}>
        <div aria-hidden className={sheet.scrim} />
        <section
          aria-label={props.title}
          className={styles.sheet}
          role="dialog"
        >
          <span aria-hidden className={sheet.handle} />
          {header}
          <div className={styles.body}>{props.children}</div>
        </section>
      </div>
    )
  }
  return (
    <div className={styles.layer}>
      <div aria-hidden className={styles.scrim} />
      <section
        aria-label={props.title}
        aria-modal
        className={styles.dialog}
        role="dialog"
      >
        {header}
        <div className={styles.body}>{props.children}</div>
      </section>
    </div>
  )
}
