import { useEffect, useRef } from 'react'

/**
 * A ref that is true while the component is mounted. A component that
 * keys its state to a scope, such as an org, unmounts when the scope
 * changes. So an answer of an old request checks this ref, then changes
 * no state and calls no callback.
 */
export function useMountedRef() {
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  return mounted
}
