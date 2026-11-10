import { DEFAULT_TOAST_DURATION, Toast } from '@firna/ui/toast'
import { noop } from '../../noop'
import { classes } from './classes'
import styles from './FailureToast.module.css'

/**
 * The toast that names a change that failed, such as a change of the list,
 * with the message of the server. The app shows it at the bottom right of
 * the window, and at the bottom of a phone screen.
 */
export function FailureToast(props: {
  title: string
  message: string
  phone: boolean
}) {
  return (
    <div className={classes(styles.layer, props.phone && styles.phone)}>
      <Toast
        onDismiss={noop}
        toast={{
          id: 'failure',
          title: props.title,
          description: props.message,
          tone: 'error',
          variant: 'card',
          duration: DEFAULT_TOAST_DURATION,
          dismissible: true,
        }}
      />
    </div>
  )
}
