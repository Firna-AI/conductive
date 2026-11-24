import { useLayoutEffect, useRef } from 'react'
import { MessageCircleQuestionMark, MessageSquareQuote } from 'lucide-react'
import type { ShortcutCommandId } from '../../shared/shortcut-commands'
import { classes } from '../../ui/components/common/classes'
import button from '../../ui/components/explain/ExplainButton.module.css'
import { askLabel, explainLabel } from '../../ui/components/explain/explainCopy'
import { ActionButton } from '../ui/actions'
import type { StartWait } from './explain-context'
import styles from './explain.module.css'
import { uiAttribute } from './mark-layout'
import { scrollParent } from './scroll-parent'

/**
 * Where the bar of Explain and Ask lines up with a selection on a computer:
 * over its middle, or over its end, where the chat has no room past it,
 * such as in a member's message at the right of the chat.
 */
export type ExplainAlign = 'middle' | 'end'

/** The space between the bar and the text of the selection. */
const gap = 6

/**
 * Places the bar just above the selection, inside its message: over the
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

/** Keeps the selection while the pointer presses Explain or Ask. */
const keepSelection = (event: { preventDefault: () => void }) =>
  event.preventDefault()

/** The actions of the bar of a selection, and the start that waits. */
interface BarProps {
  starting: StartWait
  onExplain: () => void
  onAsk: () => void
}

/**
 * Explain, then Ask, as plain buttons in the order of Tab. Explain shows a
 * spinner while its start waits. While either start waits, the other
 * button is off, so a press starts no second explanation. Only Explain
 * runs a command of the keys.
 */
function Actions(props: BarProps & { shortcut?: ShortcutCommandId }) {
  return (
    <>
      <ActionButton
        busy={props.starting === 'explain'}
        disabled={props.starting === 'ask'}
        icon={MessageSquareQuote}
        onPress={props.onExplain}
        shortcut={props.shortcut}
        tone="plain"
      >
        {explainLabel}
      </ActionButton>
      <ActionButton
        disabled={props.starting !== null}
        icon={MessageCircleQuestionMark}
        onPress={props.onAsk}
        tone="plain"
      >
        {askLabel}
      </ActionButton>
    </>
  )
}

/**
 * Explain and Ask by a finished selection on a computer. Their bar floats
 * just above the selection, as the selection tools of most editors do, so
 * it covers none of the text that the member reads next. It follows the
 * selection in the order of Tab, and the tooltip of Explain names its key.
 */
export function FloatingExplain(
  props: BarProps & { range: Range; align: ExplainAlign },
) {
  const box = useRef<HTMLSpanElement>(null)
  const { range, align } = props
  useLayoutEffect(() => {
    const node = box.current
    if (node) place(node, range, align)
  })
  return (
    <span
      className={classes(button.float, button.bar, styles.floating)}
      onMouseDown={keepSelection}
      ref={box}
      {...{ [uiAttribute]: '', 'data-explain-button': '' }}
    >
      <Actions
        onAsk={props.onAsk}
        onExplain={props.onExplain}
        shortcut="explain-selection"
        starting={props.starting}
      />
    </span>
  )
}

/**
 * Explain and Ask on a phone, above the composer, in the middle. The phone
 * shows its own selection menu and handles by the selection, so the bar
 * stays away from them.
 */
export function PhoneExplain(props: BarProps) {
  return (
    <div className={button.phoneRow}>
      <span
        className={classes(button.float, button.phoneFloat, button.bar)}
        onMouseDown={keepSelection}
        {...{ 'data-explain-button': '' }}
      >
        <Actions
          onAsk={props.onAsk}
          onExplain={props.onExplain}
          starting={props.starting}
        />
      </span>
    </div>
  )
}
