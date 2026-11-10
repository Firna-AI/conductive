import { useEffect, useRef, type HTMLAttributes } from 'react'
import { stopNextClick } from './next-click'
import { isOwnPress, longPress, touchSlop } from './pointer-drag'

/** The handlers of an element that a finger holds to open its menu. */
export type LongPressProps = Pick<
  HTMLAttributes<HTMLElement>,
  'onPointerDown' | 'onContextMenu'
>

/** A point of the window, in CSS px. */
interface Point {
  x: number
  y: number
}

/** A press of a finger on a bound element, until its release. */
interface Hold<T> extends Point {
  item: T
  pointerId: number
  timer: ReturnType<typeof setTimeout> | null
  /** The finger held still for the whole long press. */
  held: boolean
  /** Escape ended the held press, which still waits for its release. */
  cancelled: boolean
}

/**
 * A long press of a finger that opens a menu, on an element that nothing
 * drags, such as a tab of a read-only row. A finger that holds still for
 * 450 ms, then lets go within 8 px of its press, calls `onHold` with the
 * item and the point of the press. A finger that moves further, before or
 * after the hold, scrolls the page, and Escape, a cancel of the browser,
 * or an unmount ends the press with no call. The click that ends a held
 * press reaches nothing, and a finger opens no menu of the browser. A press
 * on a control with `ownPress`, such as Close, starts nothing. A mouse and
 * a pen bind nothing, so their right click opens the menu.
 *
 * `bind(item)` gives the handlers of the element.
 */
export function useLongPress<T>(onHold: (item: T, at: Point) => void) {
  const latest = useRef(onHold)
  const hold = useRef<Hold<T> | null>(null)
  const start = useRef<(next: Hold<T>) => void>(() => undefined)
  useEffect(() => {
    latest.current = onHold
  })

  useEffect(() => {
    let clickWait: (() => void) | null = null
    function onMove(event: PointerEvent) {
      const current = hold.current
      if (!current || event.pointerId !== current.pointerId) return
      const distance = Math.hypot(
        event.clientX - current.x,
        event.clientY - current.y,
      )
      if (distance > touchSlop) finish(false)
    }
    function onUp(event: PointerEvent) {
      if (event.pointerId === hold.current?.pointerId) finish(true)
    }
    function onCancel(event: PointerEvent) {
      if (event.pointerId === hold.current?.pointerId) finish(false)
    }
    function onKey(event: KeyboardEvent) {
      const current = hold.current
      if (event.key !== 'Escape' || !current) return
      // The press stays until its release, so that the release selects nothing.
      if (current.held) current.cancelled = true
      else finish(false)
    }
    function finish(release: boolean) {
      const current = hold.current
      if (current?.timer) clearTimeout(current.timer)
      hold.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('keydown', onKey)
      if (!current?.held) return
      clickWait?.()
      clickWait = stopNextClick()
      if (release && !current.cancelled) {
        latest.current(current.item, { x: current.x, y: current.y })
      }
    }
    start.current = (next) => {
      hold.current = next
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onCancel)
      window.addEventListener('keydown', onKey)
      next.timer = setTimeout(() => {
        next.timer = null
        next.held = true
        navigator.vibrate?.(10)
      }, longPress)
    }
    return () => {
      finish(false)
      clickWait?.()
    }
  }, [])

  return (item: T): LongPressProps => ({
    onPointerDown: (event) => {
      if (event.pointerType !== 'touch' || event.button !== 0) return
      if (hold.current || isOwnPress(event.nativeEvent)) return
      start.current({
        item,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        timer: null,
        held: false,
        cancelled: false,
      })
    },
    // A finger keeps its press for the hold, whose release opens the menu.
    onContextMenu: (event) => {
      if (hold.current) event.preventDefault()
    },
  })
}
