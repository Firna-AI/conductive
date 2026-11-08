import { classes } from '../common/classes'
import styles from './ResizeHandle.module.css'

/** The width of a panel that the user can drag, in px. */
export type PanelWidth = { value: number; min: number; max: number }

/** The sidebar: its default width, and the range of a drag. */
export const sidebarWidth: PanelWidth = { value: 232, min: 200, max: 360 }

/** The right column: its default width, and the range of a drag. */
export const rightColumnWidth: PanelWidth = { value: 440, min: 320, max: 640 }

/**
 * The handle on the inner edge of a resizable panel. It is a hairline at
 * rest. On hover, on focus, and while the user drags, the hairline
 * brightens and a grip in the accent colour shows in its middle. The app
 * remembers each width.
 */
export function ResizeHandle(props: {
  label: string
  /** The edge of the panel that the handle sits on. */
  edge: 'left' | 'right'
  width: PanelWidth
  /** The user drags the handle now. */
  active?: boolean
}) {
  const { width } = props
  return (
    <div
      aria-label={props.label}
      aria-orientation="vertical"
      aria-valuemax={width.max}
      aria-valuemin={width.min}
      aria-valuenow={width.value}
      className={classes(
        styles.handle,
        styles[props.edge],
        props.active && styles.active,
      )}
      role="separator"
      tabIndex={0}
    >
      <span aria-hidden className={styles.line} />
      <span aria-hidden className={styles.grip} />
    </div>
  )
}
