import { useLayoutEffect, useRef } from 'react'
import { MessageSquareQuote } from 'lucide-react'
import { classes } from '../../ui/components/common/classes'
import button from '../../ui/components/explain/ExplainButton.module.css'
import { explainLabel } from '../../ui/components/explain/explainCopy'
import { ActionButton } from '../ui/actions'
import styles from './explain.module.css'
import { uiAttribute } from './mark-layout'
import { scrollParent } from './scroll-parent'

/**
 * Where Explain lines up with a selection on a computer: over its middle,
 * or over its end, where the chat has no room past it, such as in a
 * member's message at the right of the chat.
 */
export type ExplainAlign = 'middle' | 'end'

/** The space between Explain and the text of the selection. */
const gap = 6

/**
 * Places Explain just above the selection, inside its message: over the
 * middle of the selection, or with its end at the end of the selection.
 * When the chat shows no room above the selection, it goes under it.
 */
function place(box: HTMLElement, range: Range, align: ExplainAlign) {
  const frame = box.offsetParent
  if (!(frame instanceof HTMLElement)) return
  const outer = frame.getBoundingClientRect()
  const whole = range.getBoundingClientRect()
  const lines = range.getClientRects()
  const last = lines.item(lines.length - 1) ?? whole
  const { width, height } = box.getBoundingClientRect()
  const left =
    align === 'middle'
      ? whole.left + whole.width / 2 - width / 2
      : last.right + 10 - width
  const view = scrollParent(frame)?.getBoundingClientRect()
  const above = whole.top - gap - height
  const top = view && above < view.top ? last.bottom + gap : above
  const most = Math.max(0, outer.width - width)
  box.style.left = `${Math.min(Math.max(left - outer.left, 0), most)}px`
  box.style.top = `${top - outer.top}px`
}

/** Keeps the selection while the pointer presses Explain. */
const keepSelection = (event: { preventDefault: () => void }) =>
  event.preventDefault()

/**
 * Explain by a finished selection on a computer. It floats just above the
 * selection, as the selection tools of most editors do, so it covers none
 * of the text that the member reads next. It follows the selection in the
 * order of Tab, and its tooltip names its key.
 */
export function FloatingExplain(props: {
  range: Range
  align: ExplainAlign
  busy: boolean
  onPress: () => void
}) {
  const box = useRef<HTMLSpanElement>(null)
  const { range, align } = props
  useLayoutEffect(() => {
    const node = box.current
    if (node) place(node, range, align)
  })
  return (
    <span
      className={classes(button.float, styles.floating)}
      onMouseDown={keepSelection}
      ref={box}
      {...{ [uiAttribute]: '', 'data-explain-button': '' }}
    >
      <ActionButton
        busy={props.busy}
        icon={MessageSquareQuote}
        onPress={props.onPress}
        shortcut="explain-selection"
      >
        {explainLabel}
      </ActionButton>
    </span>
  )
}

/**
 * Explain on a phone, above the composer, in the middle. The phone shows
 * its own selection menu and handles by the selection, so the button stays
 * away from them.
 */
export function PhoneExplain(props: { busy: boolean; onPress: () => void }) {
  return (
    <div className={button.phoneRow}>
      <span
        className={classes(button.float, button.phoneFloat)}
        onMouseDown={keepSelection}
        {...{ 'data-explain-button': '' }}
      >
        <ActionButton
          busy={props.busy}
          icon={MessageSquareQuote}
          onPress={props.onPress}
        >
          {explainLabel}
        </ActionButton>
      </span>
    </div>
  )
}
