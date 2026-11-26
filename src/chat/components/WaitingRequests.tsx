import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
} from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { requestStackWords } from '../../ui/components/chat/requestStackCopy'
import { RequestStackFrame } from '../../ui/components/chat/RequestStackFrame'
import { IconButton } from '../../shell/ui/actions'
import local from './chat.module.css'
import {
  emptyPlace,
  placeAfter,
  stackCards,
  type StackPlace,
  type WaitingItem,
} from './request-stack'

function samePlace(a: StackPlace, b: StackPlace): boolean {
  return (
    a.top === b.top &&
    a.order.length === b.order.length &&
    a.order.every((key, index) => b.order[index] === key)
  )
}

/**
 * Whether the stack still holds the focus after a blur: the focus moved to
 * no element because the control that held it turned off, such as Allow
 * while its answer runs.
 */
function holdsFocus(event: FocusEvent): boolean {
  const { target } = event
  if (event.relatedTarget !== null || !(target instanceof HTMLElement))
    return false
  if (target instanceof HTMLButtonElement && target.disabled) return true
  return target.getAttribute('aria-disabled') === 'true'
}

/** Whether the focus is on no element, such as after its element left. */
function focusLost(): boolean {
  const active = document.activeElement
  return active === null || active === document.body || !active.isConnected
}

/**
 * The open requests of the shown session, just above the composer, as a
 * stack that shows one card at a time, in the order of `stackCards`. The
 * stack starts with its first card on top, and Previous and Next move
 * through it. A request that joins or leaves keeps the card on top, as
 * `placeAfter` says. Give the stack the key of its session, so each
 * session starts its own stack.
 *
 * The stack holds the focus while any of its parts has it, also a sheet or
 * a menu that a card opens. After a move to the first or the last card,
 * the focus moves to the other button. A part that leaves while it holds
 * the focus, such as a card after its answer, takes the focus with it: the
 * focus then moves to the card on top, so a screen reader reads it and the
 * next Tab reaches its first action. With no card left, `focusComposer`
 * puts the focus in the field of the composer. This rescue is an effect, so
 * it comes after the cleanups of the parts that left. A value sheet keeps
 * the page inert until its cleanup, and its own focus return can go to a
 * button that is off. The stack holds the focus until a target takes it.
 */
export function WaitingRequests(props: {
  items: readonly WaitingItem[]
  focusComposer?: () => void
}) {
  const cards = stackCards(props.items)
  const [kept, setKept] = useState<StackPlace>(emptyPlace)
  const place = placeAfter(kept, cards)
  if (!samePlace(place, kept)) setKept(place)
  const inside = useRef(false)
  const card = useRef<HTMLDivElement>(null)
  const previous = useRef<HTMLElement>(null)
  const next = useRef<HTMLElement>(null)
  // The button that takes the focus after a move, because the other turns off.
  const step = useRef<'previous' | 'next' | null>(null)
  const { focusComposer } = props
  useLayoutEffect(() => {
    const moved = step.current
    step.current = null
    if (moved !== null) (moved === 'next' ? next : previous).current?.focus()
  })
  useEffect(() => {
    if (!inside.current || !focusLost()) return
    if (card.current) {
      // A card that takes the focus keeps the stack the holder, by `onFocus`.
      card.current.focus()
      return
    }
    focusComposer?.()
    if (!focusComposer || !focusLost()) inside.current = false
  })
  const at = Math.max(
    cards.findIndex((item) => item.key === place.top),
    0,
  )
  const top = cards.at(at)
  if (top === undefined) return null
  const last = cards.length - 1
  const move = (to: number) => {
    const shown = cards.at(to)
    if (shown === undefined || to < 0) return
    step.current = to === 0 ? 'next' : to === last ? 'previous' : null
    setKept({ top: shown.key, order: place.order })
  }
  return (
    <RequestStackFrame
      cardKey={top.key}
      count={cards.length}
      next={
        <IconButton
          buttonRef={(element: unknown) => {
            next.current = element instanceof HTMLElement ? element : null
          }}
          disabled={at === last}
          icon={ChevronRight}
          label={requestStackWords.next}
          onPress={() => move(at + 1)}
        />
      }
      onBlur={(event) => {
        inside.current = holdsFocus(event)
      }}
      onFocus={() => {
        inside.current = true
      }}
      place={at + 1}
      previous={
        <IconButton
          buttonRef={(element: unknown) => {
            previous.current = element instanceof HTMLElement ? element : null
          }}
          disabled={at === 0}
          icon={ChevronLeft}
          label={requestStackWords.previous}
          onPress={() => move(at - 1)}
        />
      }
    >
      <div className={local.stackCard} ref={card} tabIndex={-1}>
        {top.item.card(top.hidden)}
      </div>
    </RequestStackFrame>
  )
}
