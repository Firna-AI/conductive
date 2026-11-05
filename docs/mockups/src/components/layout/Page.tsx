import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { ChevronLeft } from 'lucide-react'
import { ScreenLink } from '../common/ScreenLink'
import { IconButton } from '../common/actions'
import styles from './Page.module.css'

export type BackLink = { label: string; to: string }

type PageProps = {
  title: string
  subtitle?: string
  back?: BackLink
  /** Page actions. Desktop shows them in the header, mobile in a footer. */
  actions?: ReactNode
  viewport: Viewport
  /** The body fills the page edge to edge, as a terminal does. */
  fill?: boolean
  /** Tabs under the header, such as the parts of a settings page. */
  tabs?: ReactNode
  children: ReactNode
}

function Titles(props: PageProps) {
  return (
    <div className={styles.titles}>
      <h1 className={styles.title}>{props.title}</h1>
      {props.subtitle ? (
        <span className={styles.subtitle}>{props.subtitle}</span>
      ) : null}
    </div>
  )
}

function DesktopHeader(props: PageProps) {
  return (
    <header className={styles.header}>
      {props.back ? (
        <ScreenLink className={styles.back} to={props.back.to}>
          <ChevronLeft size={15} />
          {props.back.label}
        </ScreenLink>
      ) : null}
      <Titles {...props} />
      {props.actions ? (
        <div className={styles.actions}>{props.actions}</div>
      ) : null}
    </header>
  )
}

function MobileHeader(props: PageProps) {
  return (
    <header className={styles.mobileHeader}>
      {props.back ? (
        <ScreenLink asChild to={props.back.to}>
          <IconButton icon={ChevronLeft} label={props.back.label} />
        </ScreenLink>
      ) : null}
      <Titles {...props} />
    </header>
  )
}

/** A page with a header and a scrolling body, for each viewport. */
export function Page(props: PageProps) {
  if (props.viewport === 'mobile') {
    return (
      <div className={styles.page}>
        <MobileHeader {...props} />
        {props.tabs ? <div className={styles.tabs}>{props.tabs}</div> : null}
        <div className={props.fill ? styles.fill : styles.mobileBody}>
          {props.children}
        </div>
        {props.actions ? (
          <div className={styles.footer}>{props.actions}</div>
        ) : null}
      </div>
    )
  }
  return (
    <div className={styles.page}>
      <DesktopHeader {...props} />
      {props.tabs ? <div className={styles.tabs}>{props.tabs}</div> : null}
      {props.fill ? (
        <div className={styles.fill}>{props.children}</div>
      ) : (
        <div className={styles.body}>
          <div className={styles.column}>{props.children}</div>
        </div>
      )}
    </div>
  )
}
