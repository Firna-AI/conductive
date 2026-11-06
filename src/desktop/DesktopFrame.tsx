import type { DesktopResponse } from '../shared/desktop'
import styles from './DesktopTool.module.css'

/**
 * The live desktop stream of the sandbox. The frame opens the URL exactly as
 * the server sent it, so the token in its fragment stays with it, and it
 * sends no referrer.
 */
export function DesktopFrame(props: {
  desktop: DesktopResponse
  onLoad: () => void
}) {
  return (
    <iframe
      className={styles.frame}
      onLoad={props.onLoad}
      referrerPolicy="no-referrer"
      src={props.desktop.url}
      title="Desktop of the sandbox"
    />
  )
}
