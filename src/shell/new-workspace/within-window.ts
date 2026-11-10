import { useEffect, useLayoutEffect, type RefObject } from 'react'

/** The gap between a menu and each side of the window, as menus keep. */
const EDGE = 4

/**
 * Moves `node`, a box that hangs below its control at the start of it, into
 * the part of the window that shows. It goes left as far as the window
 * needs, never past the left side, and it stops above the bottom of the
 * window, so that its rows scroll inside it. Where it fits, it keeps the
 * place of its styles.
 */
function fit(node: HTMLElement): void {
  node.style.left = ''
  node.style.maxHeight = ''
  const box = node.getBoundingClientRect()
  const { clientWidth: width, clientHeight: height } = document.documentElement
  const shift = Math.max(EDGE - box.left, Math.min(0, width - EDGE - box.right))
  if (shift !== 0) node.style.left = `${shift}px`
  const below = height - EDGE - box.top
  if (box.height > below) node.style.maxHeight = `${Math.max(0, below)}px`
}

/**
 * Keeps the box of `boxRef`, which hangs below its control, inside the
 * window while `enabled`, as `fit` says. It fits again after each render,
 * such as when its rows load, and at each resize of the window. The box
 * moves before the browser paints it, so no focus inside it scrolls the
 * page sideways.
 */
export function useWithinWindow(
  boxRef: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  useLayoutEffect(() => {
    const node = boxRef.current
    if (enabled && node) fit(node)
  })
  useEffect(() => {
    if (!enabled) return undefined
    const refit = () => {
      const node = boxRef.current
      if (node) fit(node)
    }
    window.addEventListener('resize', refit)
    return () => window.removeEventListener('resize', refit)
  }, [boxRef, enabled])
}
