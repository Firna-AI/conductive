import type { ReactNode } from 'react'
import { EmptyState } from '../common/EmptyState'
import { Notice } from '../common/Notice'
import { refusedIcon, suspendedOrgCopy } from './suspension'
import styles from './SuspendedOrgNotice.module.css'

/** The org of a notice. The notice needs only its name. */
type NamedOrg = { name: string }

/**
 * The notice at the top of a page of a suspended org, such as its list and
 * its settings. It has the design of a refused start, and no action,
 * because nothing that a member does ends the suspension. It imports no
 * fixture, so the app uses it too.
 */
export function SuspendedOrgNotice(props: { org: NamedOrg }) {
  const copy = suspendedOrgCopy(props.org.name)
  return <Notice body={copy.body} icon={refusedIcon} title={copy.title} />
}

/** The same notice in the empty main area of a wide desktop list. */
export function SuspendedOrgPanel(props: { org: NamedOrg }) {
  const copy = suspendedOrgCopy(props.org.name)
  return <EmptyState body={copy.body} icon={refusedIcon} title={copy.title} />
}

/**
 * The same notice above a page that has its own message, such as the page
 * of a deleted org. The page keeps its words, and the notice adds the
 * suspension and the abuse address.
 */
export function SuspendedOrgAbove(props: {
  org: NamedOrg
  children: ReactNode
}) {
  return (
    <div className={styles.above}>
      <SuspendedOrgNotice org={props.org} />
      {props.children}
    </div>
  )
}
