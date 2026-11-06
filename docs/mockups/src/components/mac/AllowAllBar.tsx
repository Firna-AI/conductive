import { Square, Timer } from 'lucide-react'
import { allowAllLeft } from '../../fixtures/mac'
import { ActionButton } from '../common/actions'
import styles from './AllowAllBar.module.css'

/**
 * The bar of the Mac app while every command of one workspace runs on this
 * Mac without asking: the time left of the 15 minutes, and Stop.
 */
export function AllowAllBar() {
  return (
    <div className={styles.bar} role="status">
      <Timer aria-hidden className={styles.icon} size={14} />
      <span className={styles.text}>
        Every command from this workspace runs on this Mac without asking.
      </span>
      <span className={styles.left}>{allowAllLeft} left</span>
      <ActionButton icon={Square}>Stop</ActionButton>
    </div>
  )
}
