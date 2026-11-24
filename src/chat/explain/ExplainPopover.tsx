import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  anchorsInCss,
  useMarkAboveSheet,
  usePanelPlace,
  useSheetTop,
} from './popover-place'
import { classes } from '../../ui/components/common/classes'
import popover from '../../ui/components/explain/ExplainPopover.module.css'
import { usePressOutside } from '../../shell/ui/press-outside'
import styles from './explain.module.css'
import { PopoverHeader, SheetHandle } from './PopoverParts'
import { keepsPopover } from './press-outside'

/**
 * The popover of an explanation. On a computer it is a panel 400 px wide by
 * its mark: below the mark, or above it when the frame has more room there,
 * at most 420 px high, and less when the room by the mark is smaller. CSS
 * anchor positioning keeps it at the box of the open mark, and a browser
 * without it gets the same place from the boxes of both. On a phone it is a
 * sheet at half the height of the screen, which a drag of its handle takes
 * to full height, where it stops under the tab row. It opens at full height
 * while a request waits for a member, and the chat scrolls its mark into
 * view above it. The parent chat stays live, so no dim lies over the app.
 * The popover takes the focus when it opens, or gives it to `field` when
 * that field shows. Escape and Close call `onClose`, which gives the focus
 * back to the mark of an explanation. On a computer, a press outside it
 * closes it too, and the focus goes where the press puts it. A press in
 * the Explain layer or on a mark keeps it, as `keepPopover` says.
 */
export function ExplainPopover(props: {
  /** The title of the explanation, or Ask before Send, which names it. */
  title: string
  quote: string
  mobile: boolean
  /** The box of the open mark or of the kept quote, if it shows. */
  anchor: HTMLElement | null
  /** A request of the session waits for a member. */
  waits: boolean
  /** The chat, whose top the sheet stops at at full height. */
  stopAt: HTMLElement | null
  /** The field that takes the focus as the popover opens, if it shows. */
  field?: RefObject<{ focus: () => void } | null>
  /** Shows the tab of the explanation. An unsent Ask has none. */
  onExpand?: () => void
  onClose: () => void
  /** Closes the popover at a press outside it, and moves no focus. */
  onPressOutside: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const [height, setHeight] = useState<'half' | 'full' | null>(null)
  const full = height === 'full' || (height === null && props.waits)
  // The popover takes the focus once, as it opens, so the field of the
  // first render counts. The parts inside lay out first, so it shows by now.
  const opening = useRef(props.field)
  useLayoutEffect(() => {
    const field = opening.current?.current
    if (field) field.focus()
    else ref.current?.focus({ preventScroll: true })
  }, [])
  usePanelPlace(ref, props.anchor, !props.mobile && !anchorsInCss())
  useMarkAboveSheet(ref, props.anchor, props.mobile)
  useSheetTop(ref, props.stopAt, props.mobile && full)
  usePressOutside(!props.mobile, ref, props.onPressOutside, {
    keep: keepsPopover,
  })
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    event.preventDefault()
    props.onClose()
  }
  const header = (
    <PopoverHeader
      onClose={props.onClose}
      onExpand={props.onExpand}
      quote={props.quote}
    />
  )
  return (
    <section
      aria-label={props.title}
      className={
        props.mobile
          ? classes(popover.sheet, full && popover.full)
          : classes(popover.panel, !props.anchor && styles.unanchored)
      }
      onKeyDown={onKeyDown}
      ref={ref}
      role="dialog"
      tabIndex={-1}
    >
      {props.mobile ? (
        <SheetHandle
          full={full}
          onFull={(next) => setHeight(next ? 'full' : 'half')}
        />
      ) : null}
      {header}
      <div className={popover.body}>{props.children}</div>
    </section>
  )
}
