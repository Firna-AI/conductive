import type { ReactNode } from 'react'
import { classes } from '../common/classes'
import { MacApp, type WindowMode } from './MacApp'
import { WindowButtons } from './WindowControls'
import styles from './MacScreen.module.css'

/**
 * The screen of a Mac with the Mac app on it, laid out at 1440 × 900 and
 * scaled to the view, in steps, because a view runs no script. A phone
 * view shows the same screen, smaller, because the app is for a Mac only.
 * In a window the app sits on the desktop. In full screen it fills the
 * screen, and macOS hides the window buttons.
 */
export function MacScreen(props: {
  mode: WindowMode
  /** The window is in front. It is not while a notification shows. */
  active?: boolean
  /** A bar of the Mac app at the top of the main area. */
  banner?: ReactNode
  /** A layer over the window, such as a dialog of the app. */
  overlay?: ReactNode
  /** A layer over the whole screen, such as a notification of macOS. */
  notification?: ReactNode
  children: ReactNode
}) {
  const window = props.mode === 'window'
  return (
    <div className={styles.viewport}>
      <div className={styles.stage}>
        <div className={classes(styles.screen, window && styles.desktop)}>
          <div className={window ? styles.window : styles.fullScreen}>
            <MacApp banner={props.banner} mode={props.mode}>
              {props.children}
            </MacApp>
            {props.overlay}
            {window ? <WindowButtons active={props.active ?? true} /> : null}
          </div>
          {props.notification}
        </div>
      </div>
    </div>
  )
}
