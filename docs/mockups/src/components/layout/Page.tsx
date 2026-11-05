import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { MockLink } from '@mokly/mokly'
import { Button } from '@firna/ui/button'
import { Caption, H3, H5 } from '@firna/ui/typography'
import { ChevronLeft } from 'lucide-react'
import { noop } from '../../noop'
import { NarrowNav } from './NarrowNav'
import styles from './Page.module.css'

export type BackLink = { label: string; to: string }

function DesktopHeader(props: PageProps) {
  return (
    <header className={styles.header}>
      <NarrowNav />
      <div className={styles.titles}>
        {props.back ? (
          <div className={styles.back}>
            <MockLink asChild to={props.back.to}>
              <Button icon={ChevronLeft} onPress={noop} size="sm" tone="plain">
                {props.back.label}
              </Button>
            </MockLink>
          </div>
        ) : null}
        <H3>{props.title}</H3>
        {props.subtitle ? <Caption>{props.subtitle}</Caption> : null}
      </div>
      {props.actions ? (
        <div className={styles.actions}>{props.actions}</div>
      ) : null}
    </header>
  )
}

function MobileHeader(props: PageProps) {
  const className = props.back
    ? styles.mobileHeader
    : `${styles.mobileHeader} ${styles.noBack}`
  return (
    <header className={className}>
      {props.back ? (
        <MockLink asChild to={props.back.to}>
          <Button
            accessibilityLabel={props.back.label}
            icon={ChevronLeft}
            onPress={noop}
            shape="square"
            tone="plain"
          />
        </MockLink>
      ) : null}
      <div className={styles.titles}>
        <H5 numberOfLines={1}>{props.title}</H5>
        {props.subtitle ? (
          <Caption numberOfLines={1}>{props.subtitle}</Caption>
        ) : null}
      </div>
    </header>
  )
}

type PageProps = {
  title: string
  subtitle?: string
  back?: BackLink
  /** Page actions. Desktop shows them in the header, mobile in a footer. */
  actions?: ReactNode
  viewport: Viewport
  /** The body fills the page edge to edge, as a terminal does. */
  fill?: boolean
  children: ReactNode
}

/** A page with a header and a scrolling body, for each viewport. */
export function Page(props: PageProps) {
  if (props.viewport === 'mobile') {
    return (
      <div className={styles.page}>
        <MobileHeader {...props} />
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
