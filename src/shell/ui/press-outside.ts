import { useEffect, useRef, type RefObject } from 'react'

/**
 * Closes an open layer on a press outside `inside`. With `modal`, the press
 * moves no focus. `keep` names the other presses that keep the layer open,
 * such as a press that the layer marked as its own in a part that lies
 * outside `inside`. A press counts as the pointer goes down, in the bubble
 * phase, so React has given the press to the parts under it first.
 */
export function usePressOutside(
  open: boolean,
  inside: RefObject<HTMLElement | null>,
  close: () => void,
  options: { modal?: boolean; keep?: (event: PointerEvent) => boolean } = {},
): void {
  const modal = options.modal ?? false
  const closeRef = useRef(close)
  const keepRef = useRef(options.keep)
  useEffect(() => {
    closeRef.current = close
    keepRef.current = options.keep
  })
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && inside.current?.contains(target)) return
      if (keepRef.current?.(event)) return
      if (modal) event.preventDefault()
      closeRef.current()
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open, inside, modal])
}
