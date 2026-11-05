import { MousePointer2 } from 'lucide-react'
import { StatusText } from '../common/StatusText'
import { StorefrontPage } from './StorefrontPage'
import styles from './DesktopView.module.css'

/**
 * The live desktop stream of the sandbox, where agents use a browser. The
 * drawing stands in for the video of the stream.
 */
export function DesktopView() {
  return (
    <div className={styles.desktop}>
      <div className={styles.toolbar}>
        <StatusText label="Live" tone="success" />
      </div>
      <div className={styles.stage}>
        <div
          aria-label="Desktop of the sandbox: a browser shows the checkout page"
          className={styles.screen}
          role="img"
        >
          <div className={styles.topbar}>
            <span>Activities</span>
            <span>14:32</span>
          </div>
          <div className={styles.window}>
            <div className={styles.titlebar}>
              <span className={styles.lights}>
                <span />
                <span />
                <span />
              </span>
              <span className={styles.tab}>Checkout · Acme</span>
            </div>
            <div className={styles.address}>localhost:3000/checkout</div>
            <div className={styles.page}>
              <StorefrontPage compact />
            </div>
          </div>
          <MousePointer2 className={styles.pointer} size={18} />
        </div>
      </div>
    </div>
  )
}
