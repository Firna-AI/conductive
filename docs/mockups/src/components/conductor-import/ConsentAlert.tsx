import { useId } from 'react'
import { productName } from '../../brand'
import { paths } from '../../paths'
import { MacAppIcon } from '../brand/Logo'
import { ScreenLink } from '../common/ScreenLink'
import styles from './ConsentAlert.module.css'

/**
 * The alert of macOS in which the Mac app asks before its first read of the
 * data of Conductor: the app icon, the question, what the app reads, and
 * Don't Allow and Allow, with Allow as the default button. The Mac app
 * draws it, not the page, so only the person at the Mac can allow the read.
 */
export function ConsentAlert() {
  const titleId = useId()
  const textId = useId()
  return (
    <div className={styles.layer}>
      <section
        aria-describedby={textId}
        aria-labelledby={titleId}
        className={styles.alert}
        role="alertdialog"
      >
        <MacAppIcon size={52} />
        <h2 className={styles.title} id={titleId}>
          Allow {productName} to read your Conductor data?
        </h2>
        <p className={styles.text} id={textId}>
          {productName} reads your local Conductor workspaces, with their chats
          and changed files, to list them. It imports only the workspaces that
          you choose.
        </p>
        <div className={styles.buttons}>
          <ScreenLink className={styles.button} to={paths.macImportDenied}>
            Don&apos;t Allow
          </ScreenLink>
          <ScreenLink
            className={`${styles.button} ${styles.default}`}
            to={paths.macImportReading}
          >
            Allow
          </ScreenLink>
        </div>
      </section>
    </div>
  )
}
