import { useEffect, useEffectEvent, useRef } from 'react'

/**
 * Calls `show` once for each address that names a port, as soon as `ready`
 * holds. While the address stays, a render or an answer calls nothing more,
 * so each address of a port sends at most one open request. An address
 * with no port ends it, so a later address of the same port calls `show`
 * again.
 */
export function useAddressPort(
  port: number | null,
  ready: boolean,
  show: (port: number) => void,
): void {
  /** The port that `show` took, until the address names no port. */
  const shown = useRef<number | null>(null)
  const showPort = useEffectEvent(show)
  useEffect(() => {
    if (port === null) {
      shown.current = null
      return
    }
    if (!ready || shown.current === port) return
    shown.current = port
    showPort(port)
  }, [port, ready])
}
