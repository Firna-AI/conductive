import {
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { classes } from '../../ui/components/common/classes'
import styles from '../../ui/components/common/Sheet.module.css'
import { Overlay, useModalLayer, type Focusable } from './Overlay'
import { controlsOf, keepTabInside, tabWithScrollingBody } from './tab-stops'

/**
 * Keeps the Tab key inside a modal layer, as a dialog needs. Tab from the
 * last element goes to the first, and Shift+Tab from the first goes to the
 * last. From the layer itself, which takes the focus on a press outside its
 * controls, Tab goes to the first and Shift+Tab to the last. The layer
 * listens in the capture phase, because a text field stops its key events.
 * `tabbableOf` gives the elements that Tab moves between, in their order.
 * By default they are the controls of the layer that can take the focus.
 * `body` is the box of a card that scrolls its content. While it scrolls
 * text without a control, it is a stop too, as `tabWithScrollingBody` says.
 */
export function trapTab(
  event: KeyboardEvent<HTMLElement>,
  tabbableOf: (layer: HTMLElement) => readonly HTMLElement[] = controlsOf,
  body: HTMLElement | null = null,
): void {
  if (event.key !== 'Tab') return
  const tabbable = tabbableOf(event.currentTarget)
  if (tabWithScrollingBody(event, tabbable, body)) return
  keepTabInside(event, tabbable, event.target)
}

/**
 * A sheet that rises from the bottom of a phone screen over the dimmed
 * app. It stops below the top of the screen, as the mockups draw it: its
 * handle and title stay, and its body scrolls when the content is longer.
 * A press on the dim area or Escape closes it, and the focus goes back
 * to its trigger. `returnFocus` names that trigger when a render can
 * replace it while the sheet shows, such as the row of a menu that moves
 * the row. `initial` is the part that takes the focus as it opens.
 *
 * The title takes one line, with an ellipsis when it is longer.
 * `wrapTitle` gives it more lines in place of the ellipsis, for a title
 * that is the only place where the sheet names its subject, such as a
 * repository in a question.
 */
export function Sheet(props: {
  title: string
  close: () => void
  returnFocus?: () => void
  initial?: RefObject<Focusable | null>
  wrapTitle?: boolean
  children: ReactNode
}) {
  const sheet = useRef<HTMLElement>(null)
  useModalLayer(sheet, props.close, {
    returnFocus: props.returnFocus,
    initial: props.initial,
  })
  return (
    <Overlay>
      <div className={styles.layer}>
        <div aria-hidden className={styles.scrim} />
        <section
          aria-label={props.title}
          aria-modal
          className={styles.sheet}
          onKeyDownCapture={trapTab}
          ref={sheet}
          role="dialog"
          tabIndex={-1}
        >
          <span aria-hidden className={styles.handle} />
          <h2
            className={classes(
              styles.title,
              props.wrapTitle && styles.wrapTitle,
            )}
          >
            {props.title}
          </h2>
          <div className={styles.body}>{props.children}</div>
        </section>
      </div>
    </Overlay>
  )
}
