import {
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import styles from '../../../docs/mockups/src/components/common/Sheet.module.css'
import {
  focusableSelector,
  Overlay,
  useModalLayer,
  type Focusable,
} from './Overlay'

/**
 * Keeps the Tab key inside a modal layer, as a dialog needs. Tab from the
 * last element goes to the first, and Shift+Tab from the first goes to the
 * last. From the layer itself, which takes the focus on a press outside its
 * controls, Tab goes to the first and Shift+Tab to the last. The layer
 * listens in the capture phase, because a text field stops its key events.
 */
export function trapTab(event: KeyboardEvent<HTMLElement>): void {
  if (event.key !== 'Tab') return
  const tabbable = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter((element) => element.tabIndex >= 0)
  const first = tabbable[0]
  const last = tabbable.at(-1)
  if (!first || !last) {
    event.preventDefault()
    return
  }
  const from = event.target
  const inside = tabbable.some((element) => element === from)
  if (event.shiftKey && (from === first || !inside)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (from === last || !inside)) {
    event.preventDefault()
    first.focus()
  }
}

/**
 * A sheet that rises from the bottom of a phone screen over the dimmed
 * app. It stops below the top of the screen, as the mockups draw it: its
 * handle and title stay, and its body scrolls when the content is longer.
 * A press on the dim area or Escape closes it, and the focus goes back
 * to its trigger. `returnFocus` names that trigger when a render can
 * replace it while the sheet shows, such as the row of a menu that moves
 * the row. `initial` is the part that takes the focus as it opens.
 */
export function Sheet(props: {
  title: string
  close: () => void
  returnFocus?: () => void
  initial?: RefObject<Focusable | null>
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
          <h2 className={styles.title}>{props.title}</h2>
          <div className={styles.body}>{props.children}</div>
        </section>
      </div>
    </Overlay>
  )
}
