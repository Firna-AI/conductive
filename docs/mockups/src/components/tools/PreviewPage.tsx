import type { ReactNode } from 'react'
import { openPort } from '../../fixtures/previews'
import { StorefrontPage } from './StorefrontPage'
import styles from './PreviewPage.module.css'

/**
 * The page of the open preview, in the one Preview tab of the centre row
 * on desktop (decision 288). The page fills the tab, as in a browser tab.
 * Reload and Open stay in the Preview tool of the tools panel, so the tab
 * has no bar of its own. `placeholder`, such as the state of a sandbox
 * that starts, shows in place of the page.
 */
export function PreviewPage(props: { placeholder?: ReactNode }) {
  return (
    <div className={styles.page}>
      {props.placeholder ?? (
        <div className={styles.frame} title={`Preview of port ${openPort}`}>
          <StorefrontPage />
        </div>
      )}
    </div>
  )
}
