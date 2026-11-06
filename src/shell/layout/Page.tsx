import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/layout/Page.module.css'
import { IconButton } from '../ui/actions'
import { AppLink, useGo } from '../ui/AppLink'
import { useViewport } from '../ui/viewport'

export interface BackLink {
  label: string
  to: string
}

export interface PageProps {
  title: string
  subtitle?: string
  /** The way back. A phone shows it; desktop shows it when `backOnDesktop`. */
  back?: BackLink
  backOnDesktop?: boolean
  /** Page actions. Desktop shows them in the header, a phone in a footer. */
  actions?: ReactNode
  /** The body fills the page edge to edge, as a chat does. */
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

function PhonePage(props: PageProps) {
  const go = useGo()
  const back = props.back
  return (
    <div className={styles.page}>
      <header className={styles.mobileHeader}>
        {back ? (
          <IconButton
            icon={ChevronLeft}
            label={back.label}
            onPress={() => go(back.to)}
          />
        ) : null}
        <Titles {...props} />
      </header>
      {props.tabs ? (
        <div className={styles.mobileTabs}>{props.tabs}</div>
      ) : null}
      <div className={props.fill ? styles.fill : styles.mobileBody}>
        {props.children}
      </div>
      {props.actions ? (
        <div className={styles.footer}>{props.actions}</div>
      ) : null}
    </div>
  )
}

/** A page with a header and a scrolling body, in the layout of the window. */
export function Page(props: PageProps) {
  const viewport = useViewport()
  if (viewport === 'phone') return <PhonePage {...props} />
  const back = props.backOnDesktop ? props.back : undefined
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {back ? (
          <AppLink className={styles.back} to={back.to}>
            <ChevronLeft aria-hidden size={15} />
            {back.label}
          </AppLink>
        ) : null}
        <Titles {...props} />
        {props.actions ? (
          <div className={styles.actions}>{props.actions}</div>
        ) : null}
      </header>
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
