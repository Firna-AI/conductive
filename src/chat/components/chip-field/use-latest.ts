import { useLayoutEffect, useRef } from 'react'

/**
 * The latest value of a prop, for a listener that the editor keeps. The ref
 * takes the value at each commit, before the effects that come after it in
 * the same component. So a layout effect, a command, or an event after the
 * commit reads the value of that render, not of the render before.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}
