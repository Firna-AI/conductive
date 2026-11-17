import { useLayoutEffect, useState, type RefObject } from 'react'

/**
 * Whether the text of `node` is taller than its box while it is short.
 * While the text shows in full, the last answer stays, so Show less stays.
 * A change of the width or of `content` measures again, because the text
 * then wraps again.
 */
export function useClipped(
  node: RefObject<HTMLElement | null>,
  open: boolean,
  content: string,
) {
  const [clipped, setClipped] = useState(false)
  useLayoutEffect(() => {
    const element = node.current
    if (!element || open) return
    const measure = () => {
      setClipped(element.scrollHeight > element.clientHeight + 1)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [node, open, content])
  return clipped
}
