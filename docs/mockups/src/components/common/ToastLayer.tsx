import { createToastItem, Toast, type ToastOptions } from '@firna/ui/toast'
import { noop } from '../../noop'
import styles from './ToastLayer.module.css'

/**
 * A toast of the app, drawn open at the bottom right of the screen, where
 * the app shows its toasts. It is the toast of Firna. In a picture of the
 * screen it stays until the person closes it.
 */
export function ToastLayer(props: { toast: ToastOptions }) {
  const toast = createToastItem('toast', { ...props.toast, duration: null }, 0)
  return (
    <div aria-label="Notifications" className={styles.layer} role="region">
      <Toast onDismiss={noop} toast={toast} />
    </div>
  )
}
