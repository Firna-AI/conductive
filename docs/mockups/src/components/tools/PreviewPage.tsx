import type { ReactNode } from 'react'
import { openPort } from '../../fixtures/previews'
import { PreviewActions } from './PortPreview'
import { StorefrontPage } from './StorefrontPage'
import styles from './PreviewPage.module.css'

/**
 * The page of the open preview, in the one Preview tab of the centre row
 * on desktop (decision 288). A bar over the page holds Reload, which loads
 * the page again, and Open, which opens it in a new browser tab. Only the
 * Preview tab has this bar. The page fills the rest of the tab.
 * `placeholder`, such as the state of a sandbox that starts, shows in place
 * of the bar and the page, because no page loads then.
 */
export function PreviewPage(props: { placeholder?: ReactNode }) {
  return (
    <section aria-label={`Preview of port ${openPort}`} className={styles.page}>
      {props.placeholder ?? (
        <>
          <div className={styles.bar}>
            <PreviewActions />
          </div>
          <div className={styles.frame}>
            <StorefrontPage />
          </div>
        </>
      )}
    </section>
  )
}
