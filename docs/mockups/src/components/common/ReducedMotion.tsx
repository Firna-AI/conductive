import type { ReactNode } from 'react'
import styles from './ReducedMotion.module.css'

/**
 * Draws a screen as a browser shows it when its user asks for reduced
 * motion. A view cannot set that setting of the browser, so the marks of
 * `WorkspaceMark.module.css` and `StatusGlyph.module.css` take their still
 * form under `data-motion="reduced"` too. The wrapper adds no box, so the
 * layout of the screen stays the same.
 */
export function ReducedMotion(props: { children: ReactNode }) {
  return (
    <div className={styles.wrapper} data-motion="reduced">
      {props.children}
    </div>
  )
}
