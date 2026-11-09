import { useEffect, useRef, useState, type HTMLAttributes } from 'react'
import { stopNextClick } from './next-click'

/** The box of an element, in CSS px of the window. */
interface DragBox {
  left: number
  top: number
  width: number
  height: number
}

/** A drag that runs: what moves, where it lands, and where the pointer is. */
export interface PointerDrag<T, P> {
  /** What the pressed element carries, as `bind` got it. */
  item: T
  /** The place of the item at the press. A drop there moves nothing. */
  from: P
  /** The drop place under the pointer, as `locate` found it. */
  place: P
  /** The pointer, in CSS px of the window. */
  x: number
  y: number
  /** The box of the pressed element at the press. */
  box: DragBox
  /** The pressed point, from the top left corner of `box`. */
  offsetX: number
  offsetY: number
  /** A finger lifted the item with a long press. */
  touch: boolean
  /**
   * The pointer moved after the lift. A mouse or a pen lifts the item with a
   * move. A finger that stays within 8 px of its press has not moved.
   */
  moved: boolean
}

export interface PointerDragOptions<T, P> {
  /** The drop place at the pointer. `last` is the place before this move. */
  locate: (item: T, x: number, y: number, last: P) => P
  /**
   * The release of a drag. A long press that ends with no move comes here
   * too, with `moved` false. Escape, a cancel of the browser, and an unmount
   * end a drag with no call.
   */
  drop: (drag: PointerDrag<T, P>) => void
}

/** The handlers of the element where a drag starts. */
export type PointerDragProps = Pick<
  HTMLAttributes<HTMLElement>,
  'onPointerDown' | 'onContextMenu' | 'onDragStart'
>

/** A press of the pointer on a bound element, until its release. */
interface Press<T, P> {
  item: T
  from: P
  pointerId: number
  startX: number
  startY: number
  x: number
  y: number
  box: DragBox
  touch: boolean
  timer: ReturnType<typeof setTimeout> | null
  /** The press lifted the item. It stays true after Escape ends the drag. */
  lifted: boolean
}

/** A mouse or a pen moves this far before a drag starts. */
const dragDistance = 4
/** A finger that moves this far before its long press scrolls instead. */
const touchSlop = 8
/** A finger holds this long to lift the item. */
const longPress = 450

/** The presses that a control inside a bound element keeps for itself. */
const ownPresses = new WeakSet<Event>()

/**
 * The props of a control inside a bound element that keeps its own press,
 * such as a Close button. A press on it starts no drag.
 */
export const ownPress: Pick<HTMLAttributes<HTMLElement>, 'onPointerDown'> = {
  onPointerDown: (event) => {
    ownPresses.add(event.nativeEvent)
  },
}

/**
 * Drag and drop with any pointer. A mouse or a pen drags after a move of
 * more than 4 px. A finger lifts the item after a long press of 450 ms, and
 * the page does not scroll while the item is lifted. A finger that moves
 * first scrolls the page. Escape ends a drag with no drop. The click that
 * ends a lifted press reaches nothing, also the click that a finger sends
 * after it lets go. A finger opens no menu of the browser, and no press
 * starts a native drag. A scroll during a drag, of the page or of any
 * element, finds the drop place again.
 *
 * `bind(item, from)` gives the handlers of the element where a drag starts.
 * `locate` finds the drop place at each move of the pointer, and `drop`
 * gets the drag at its release.
 */
export function usePointerDrag<T, P>(options: PointerDragOptions<T, P>) {
  const [drag, setDrag] = useState<PointerDrag<T, P> | null>(null)
  const latest = useRef(options)
  const press = useRef<Press<T, P> | null>(null)
  const dragging = useRef<PointerDrag<T, P> | null>(null)
  const clickWait = useRef<(() => void) | null>(null)
  const start = useRef<(press: Press<T, P>) => void>(() => undefined)
  useEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    function show(state: PointerDrag<T, P> | null) {
      dragging.current = state
      setDrag(state)
    }
    function lift(current: Press<T, P>) {
      if (current.timer) clearTimeout(current.timer)
      current.timer = null
      current.lifted = true
      if (current.touch) navigator.vibrate?.(10)
      const { item, from, x, y, box, touch } = current
      show({
        item,
        from,
        place: latest.current.locate(item, x, y, from),
        x,
        y,
        box,
        offsetX: current.startX - box.left,
        offsetY: current.startY - box.top,
        touch,
        moved: !touch,
      })
    }
    function onMove(event: PointerEvent) {
      const current = press.current
      if (!current || event.pointerId !== current.pointerId) return
      // The release came out of sight, such as over a menu of the system.
      if ((event.buttons & 1) === 0) return finish(false)
      current.x = event.clientX
      current.y = event.clientY
      const distance = Math.hypot(
        current.x - current.startX,
        current.y - current.startY,
      )
      if (!current.lifted) {
        if (current.touch && distance > touchSlop) finish(false)
        else if (!current.touch && distance > dragDistance) lift(current)
        return
      }
      const state = dragging.current
      if (!state) return
      show({
        ...state,
        place: latest.current.locate(
          state.item,
          current.x,
          current.y,
          state.place,
        ),
        x: current.x,
        y: current.y,
        moved: state.moved || distance > touchSlop,
      })
    }
    function onTouchMove(event: TouchEvent) {
      if (press.current?.lifted) event.preventDefault()
    }
    // A scroll under a still pointer, such as of a row that a drag near its
    // end scrolls, moves the drop places under it.
    function onScroll() {
      const current = press.current
      const state = dragging.current
      if (!current || !state) return
      const place = latest.current.locate(
        state.item,
        current.x,
        current.y,
        state.place,
      )
      if (!Object.is(place, state.place)) show({ ...state, place })
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape' || !press.current) return
      // The press stays until its release, so that the release selects nothing.
      if (press.current.lifted) show(null)
      else finish(false)
    }
    function onUp(event: PointerEvent) {
      if (event.pointerId === press.current?.pointerId) finish(true)
    }
    function onCancel(event: PointerEvent) {
      if (event.pointerId === press.current?.pointerId) finish(false)
    }
    function finish(release: boolean) {
      const current = press.current
      const state = dragging.current
      if (current?.timer) clearTimeout(current.timer)
      press.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('scroll', onScroll, true)
      if (state) show(null)
      if (!current?.lifted) return
      clickWait.current?.()
      clickWait.current = stopNextClick()
      if (release && state) latest.current.drop(state)
    }
    start.current = (next) => {
      press.current = next
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onCancel)
      window.addEventListener('keydown', onKey)
      document.addEventListener('touchmove', onTouchMove, { passive: false })
      document.addEventListener('scroll', onScroll, {
        capture: true,
        passive: true,
      })
      if (next.touch) next.timer = setTimeout(() => lift(next), longPress)
    }
    return () => {
      finish(false)
      clickWait.current?.()
    }
  }, [])

  const bind = (item: T, from: P): PointerDragProps => ({
    onPointerDown: (event) => {
      if (event.button !== 0 || press.current) return
      if (ownPresses.has(event.nativeEvent)) return
      const box = event.currentTarget.getBoundingClientRect()
      start.current({
        item,
        from,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        box: {
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
        },
        touch: event.pointerType === 'touch',
        timer: null,
        lifted: false,
      })
    },
    onContextMenu: (event) => {
      if (press.current?.touch) event.preventDefault()
    },
    onDragStart: (event) => event.preventDefault(),
  })

  return { drag, bind }
}
