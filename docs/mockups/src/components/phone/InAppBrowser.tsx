import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
  RotateCw,
  Share,
} from 'lucide-react'
import { classes } from '../../../../../src/ui/components/common/classes'
import { Linked } from '../common/ScreenLink'
import { inAppBrowserCopy as copy } from './browserCopy'
import styles from './InAppBrowser.module.css'

/** A control of the bars of the browser. Back and Forward start off. */
function BrowserTool(props: {
  icon: LucideIcon
  label: string
  off?: boolean
}) {
  const Icon = props.icon
  return (
    <button
      aria-label={props.label}
      className={styles.tool}
      disabled={props.off}
      type="button"
    >
      <Icon aria-hidden size={20} />
    </button>
  )
}

/** Back, Forward, Share, and Open in browser. */
function PageTools() {
  return (
    <>
      <BrowserTool icon={ChevronLeft} label={copy.back} off />
      <BrowserTool icon={ChevronRight} label={copy.forward} off />
      <BrowserTool icon={Share} label={copy.share} />
      <BrowserTool icon={ExternalLink} label={copy.openInBrowser} />
    </>
  )
}

/**
 * The in-app browser of the system over the app, as iOS draws it in
 * neutral shapes. Its bar holds Done, which closes it and shows the app
 * again, the host of the page with the lock of a secure page, and Reload.
 * A phone puts Back, Forward, Share, and Open in browser in a bar at the
 * bottom. A tablet puts them in the top bar. The page fills the rest.
 */
export function InAppBrowser(props: {
  layout: 'phone' | 'tablet'
  host: string
  /** The screen of the app that Done shows again. */
  doneTo?: string
  children: ReactNode
}) {
  const phone = props.layout === 'phone'
  // A page in the browser can have its own main landmark, so the browser
  // of the system is a section.
  return (
    <section
      aria-label={props.host}
      className={classes(styles.browser, !phone && styles.tablet)}
    >
      <header className={styles.bar}>
        <span className={styles.start}>
          <Linked to={props.doneTo}>
            <button className={styles.done} type="button">
              {copy.done}
            </button>
          </Linked>
          {phone ? null : (
            <>
              <BrowserTool icon={ChevronLeft} label={copy.back} off />
              <BrowserTool icon={ChevronRight} label={copy.forward} off />
            </>
          )}
        </span>
        <span className={styles.address}>
          <Lock aria-label={copy.secure} role="img" size={11} />
          <span className={styles.host}>{props.host}</span>
        </span>
        <span className={styles.end}>
          <BrowserTool icon={RotateCw} label={copy.reload} />
          {phone ? null : (
            <>
              <BrowserTool icon={Share} label={copy.share} />
              <BrowserTool icon={ExternalLink} label={copy.openInBrowser} />
            </>
          )}
        </span>
      </header>
      <div className={styles.page}>{props.children}</div>
      {phone ? (
        <footer className={styles.toolbar}>
          <PageTools />
        </footer>
      ) : null}
    </section>
  )
}
