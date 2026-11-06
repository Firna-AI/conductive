import type { MacCommandRequest } from '../../fixtures/mac'
import { checkoutAutocomplete } from '../../fixtures/workspaces'
import { paths } from '../../paths'
import { MacAppIcon } from '../brand/Logo'
import { ScreenLink } from '../common/ScreenLink'
import styles from './MacNotification.module.css'

/**
 * The notification of macOS while the Mac app is in the background. It
 * opens the prompt of the command.
 */
export function MacNotification(props: { request: MacCommandRequest }) {
  return (
    <ScreenLink className={styles.notification} to={paths.macPrompt}>
      <MacAppIcon size={40} />
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
