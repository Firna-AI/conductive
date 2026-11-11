import type { ColorScheme, Viewport } from '@mokly/mokly'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { darkSchemeQuery } from '../../emails/emailStyles'
import {
  replyAddress,
  senderAddress,
  senderName,
} from '../../emails/emailWords'
import { LogoTile } from '../brand/Logo'
import { classes } from '../common/classes'
import styles from './EmailFrame.module.css'

/**
 * The markup of an email as a mail client gets it. A dark view shows the
 * dark colours, as an email client in dark mode that reads them shows them.
 */
function emailDocument(email: ReactElement, scheme: ColorScheme): string {
  const html = `<!DOCTYPE html>${renderToStaticMarkup(email)}`
  if (scheme === 'light') return html
  const query = `@media ${darkSchemeQuery}`
  if (!html.includes(query)) {
    throw new Error('The email has no dark colours to show.')
  }
  return html.replace(query, '@media all')
}

/**
 * An email as a mail client shows it: the subject, the sender with the reply
 * address and the recipient, and the email below them. The email is the
 * real template, in a frame of its own, so no style of the catalogue
 * reaches it.
 */
export function EmailFrame(props: {
  subject: string
  to: string
  email: ReactElement
  viewport: Viewport
  colorScheme: ColorScheme
}) {
  return (
    <div
      className={classes(
        styles.frame,
        props.viewport === 'mobile' && styles.mobile,
      )}
    >
      <header className={styles.header}>
        <h1 className={styles.subject}>{props.subject}</h1>
        <div className={styles.sender}>
          <LogoTile size={32} />
          <div className={styles.senderText}>
            <p className={styles.from}>
              <span className={styles.name}>{senderName}</span>{' '}
              <span className={styles.muted}>{senderAddress}</span>
            </p>
            <p className={styles.meta}>To {props.to}</p>
            <p className={styles.meta}>Reply to {replyAddress}</p>
          </div>
        </div>
      </header>
      <iframe
        className={styles.email}
        sandbox=""
        srcDoc={emailDocument(props.email, props.colorScheme)}
        title={props.subject}
      />
    </div>
  )
}
