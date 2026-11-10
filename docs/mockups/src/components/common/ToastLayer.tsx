import { createToastItem, Toast, type ToastOptions } from '@firna/ui/toast'
import { noop } from '../../noop'
import { classes } from './classes'
import styles from './ToastLayer.module.css'

/**
 * A toast of the app, drawn open where the app shows its toasts: at the
 * bottom right of the window, and across the bottom of a phone screen. It
 * is the toast of Firna. In a picture of the screen it stays until the
 * person closes it.
 */
export function ToastLayer(props: { toast: ToastOptions; phone: boolean }) {
  const toast = createToastItem('toast', { ...props.toast, duration: null }, 0)
  return (
    <div className={classes(styles.layer, props.phone && styles.phone)}>
      <Toast onDismiss={noop} toast={toast} />
    </div>
  )
}
