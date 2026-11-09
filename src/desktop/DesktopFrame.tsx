import { useLayoutEffect } from 'react'
import type { DesktopResponse } from '../shared/desktop'
import styles from './DesktopTool.module.css'

/** The origin of an address, or null for a keyword such as `inline`. */
function originOf(address: string): string | null {
  try {
    return new URL(address).origin
  } catch {
    return null
  }
}

/**
 * The live desktop stream of the sandbox. The frame opens the URL exactly as
 * the server sent it, so the token in its fragment stays with it, and it
 * sends no referrer.
 *
 * The page policy can block the frame. The browser then fires `load` all
 * the same, so `onBlocked` reports the block of the stream's origin.
 */
export function DesktopFrame(props: {
  desktop: DesktopResponse
  onLoad: () => void
  onBlocked: () => void
}) {
  const { onBlocked } = props
  const { url } = props.desktop

  // A layout effect runs in the task that adds the frame. The browser sends
  // its report of a block to the document in a later task, so the listener
  // misses no report.
  useLayoutEffect(() => {
    // The response parser accepts only an http or https address.
    const { origin } = new URL(url)
    const listener = (event: SecurityPolicyViolationEvent) => {
      if (
        event.effectiveDirective === 'frame-src' &&
        event.disposition !== 'report' &&
        originOf(event.blockedURI) === origin
      )
        onBlocked()
    }
    document.addEventListener('securitypolicyviolation', listener)
    return () =>
      document.removeEventListener('securitypolicyviolation', listener)
  }, [url, onBlocked])

  return (
    <iframe
      className={styles.frame}
      onLoad={props.onLoad}
      referrerPolicy="no-referrer"
      src={url}
      title="Desktop of the sandbox"
    />
  )
}
