import { useEffect, type RefObject } from 'react'

/**
 * The areas that can take the focus for a new screen, the newest last: the
 * main area of each desktop frame. Each gives whether it took the focus.
 */
const areas: (() => boolean)[] = []

/** A layer asked the new screen to take the focus, in this task. */
let wanted = false

function offer(): void {
  for (const take of [...areas].reverse()) {
    if (!wanted) return
    if (take()) wanted = false
  }
}

/**
 * Asks the new screen to take the focus, as a layer closes with a move to
 * another address. The main area of a desktop frame takes it: the frame of
 * the old screen, or a frame that mounts for the new screen in the same
 * render. A request that no frame takes, such as on a phone, ends with the
 * task, without an effect.
 */
export function requestScreenFocus(): void {
  wanted = true
  offer()
  queueMicrotask(() => {
    wanted = false
  })
}

/**
 * Lets `area`, the main area of a frame, take the focus for a new screen.
 * It can take the focus only for such a request, so it is no tab stop: it
 * stops being focusable when the focus leaves it.
 */
export function useScreenFocus(area: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const take = (): boolean => {
      const node = area.current
      if (!node?.isConnected) return false
      const leave = () => {
        // A window that loses the focus keeps its focused element.
        if (!document.hasFocus()) return
        node.removeAttribute('tabindex')
        node.removeEventListener('blur', leave)
      }
      node.tabIndex = -1
      node.addEventListener('blur', leave)
      node.focus({ preventScroll: true })
      return true
    }
    areas.push(take)
    offer()
    return () => {
      areas.splice(areas.indexOf(take), 1)
    }
  }, [area])
}
