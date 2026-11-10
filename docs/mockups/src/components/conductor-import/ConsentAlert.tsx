import { useId, type ReactNode } from 'react'
import { productName } from '../../brand'
import { MacAppIcon } from '../brand/Logo'
import { ScreenLink } from '../common/ScreenLink'
import styles from './ConsentAlert.module.css'

/**
 * A button of the alert, which opens `to`. Null keeps it static, as a span
 * with the same look, as a still link of the catalogue is.
 */
function AlertButton(props: {
  className: string
  to: string | null
  children: ReactNode
}) {
  if (props.to === null) {
    return <span className={props.className}>{props.children}</span>
  }
  return (
    <ScreenLink className={props.className} to={props.to}>
      {props.children}
    </ScreenLink>
  )
}

/**
 * The alert of macOS in which the Mac app asks before its first read of the
 * data of Conductor: the app icon, the question, what the app reads, and
 * Don't Allow and Allow, with Allow as the default button. The Mac app
 * draws it, not the page, so only the person at the Mac can allow the read.
 * Allow opens `allowTo`, and Don't Allow opens `denyTo`. Null keeps a
 * button static.
 */
export function ConsentAlert(props: {
  allowTo: string | null
  denyTo: string | null
}) {
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
          <AlertButton className={styles.button} to={props.denyTo}>
            Don&apos;t Allow
          </AlertButton>
          <AlertButton
            className={`${styles.button} ${styles.default}`}
            to={props.allowTo}
          >
            Allow
          </AlertButton>
        </div>
      </section>
    </div>
  )
}
