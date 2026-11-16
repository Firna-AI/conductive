import { iconButton } from '../../entries/components/common/actions.mockup'
import { classes } from '../common/classes'
import type { WindowMode } from './MacApp'
import styles from './WindowControls.module.css'

/**
 * The native close, minimize, and zoom buttons. macOS draws them over the
 * page, at the top left of the window, so they stay above every layer of
 * the app, such as a dialog.
 */
export function WindowButtons(props: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={classes(styles.buttons, !props.active && styles.inactive)}
    >
      <span className={classes(styles.button, styles.close)} />
      <span className={classes(styles.button, styles.minimize)} />
      <span className={classes(styles.button, styles.zoom)} />
    </span>
  )
}

/**
 * The top of the left panel of the Mac app, which has no title bar. In a
 * window it keeps the space of the window buttons at the left, then the
 * sidebar toggle, and back and forward at the right. In full screen macOS
 * hides the window buttons, and the toggle takes their space.
 */
export function WindowControls(props: { mode: WindowMode }) {
  return (
    <div className={styles.controls}>
      {props.mode === 'window' ? (
        <span aria-hidden className={styles.reserved} />
      ) : null}
      <iconButton.Component
        icon="panel-left"
        label="Hide the sidebar"
        moklyInstance="hide-sidebar"
      />
      <span className={styles.spacer} />
      <iconButton.Component
        icon="arrow-left"
        label="Back"
        moklyInstance="back"
      />
      <iconButton.Component
        disabled
        icon="arrow-right"
        label="Forward"
        moklyInstance="forward"
      />
    </div>
  )
}
