import { useLayoutEffect, useState, type RefObject } from 'react'

/**
 * The distance from the bottom of the chat, in pixels, from which the reader
 * counts as scrolled up. A small nudge, such as a line, shows no button.
 */
const scrolledUpFrom = 80

/**
 * Whether the reader of the chat in `scroller` reads higher up, at least
 * `scrolledUpFrom` above the bottom. The box keeps its bottom in place, so
 * its scroll position counts up to 0 at the bottom, and only a scroll moves
 * the reader from the bottom. `shown` says whether the chat shows its
 * transcript. Without it, the reader is at the bottom.
 */
export function useScrolledUp(
  scroller: RefObject<HTMLElement | null>,
  shown: boolean,
): boolean {
  const [up, setUp] = useState(false)
  useLayoutEffect(() => {
    const box = scroller.current
    if (!shown || !box) return
    const check = () => setUp(-box.scrollTop >= scrolledUpFrom)
    check()
    box.addEventListener('scroll', check, { passive: true })
    return () => {
      box.removeEventListener('scroll', check)
      setUp(false)
    }
  }, [scroller, shown])
  return up
}
