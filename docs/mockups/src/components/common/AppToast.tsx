import {
  createToastItem,
  DEFAULT_TOAST_DURATION,
  Toast,
  type ToastTone,
} from '@firna/ui/toast'
import { noop } from '../../noop'
import styles from './AppToast.module.css'

/**
 * A toast of the app, drawn in place: the toast card of `@firna/ui` at the
 * bottom right of the screen, where the toast region of the app shows it.
 * It gives the result of an action whose control closes, such as a copy
 * from a menu. A view runs no script, so the toast stays.
 */
export function AppToast(props: { title: string; tone: ToastTone }) {
  const toast = createToastItem(
    'toast',
    { title: props.title, tone: props.tone },
    DEFAULT_TOAST_DURATION,
  )
  return (
    <div aria-label="Notifications" className={styles.region} role="region">
      <Toast onDismiss={noop} toast={toast} />
    </div>
  )
}
