import { Layers } from 'lucide-react'
import type { MacCommandRequest } from '../../fixtures/mac'
import { checkoutAutocomplete } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import styles from './MacNotification.module.css'

/** The icon of the Mac app, as macOS shows it in a notification. */
function AppIcon() {
  return (
    <span aria-hidden className={styles.appIcon}>
      <Layers size={18} strokeWidth={2.25} />
    </span>
  )
}

/**
 * The notification of macOS while the Mac app is in the background. It
 * opens the prompt of the command.
 */
export function MacNotification(props: { request: MacCommandRequest }) {
  return (
    <ScreenLink className={styles.notification} to={paths.macPrompt}>
      <AppIcon />
      <span className={styles.text}>
        <span className={styles.top}>
          <span className={styles.title}>Run a command on this Mac?</span>
          <span className={styles.time}>now</span>
        </span>
        <span className={styles.body}>
          An agent in {checkoutAutocomplete.name} asks to run{' '}
          {props.request.command}.
        </span>
      </span>
    </ScreenLink>
  )
}
