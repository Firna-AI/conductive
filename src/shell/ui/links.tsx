import type { ReactNode } from 'react'
import { ExternalLink as ExternalLinkIcon } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import external from '../../../docs/mockups/src/components/common/ExternalLink.module.css'
import tabs from '../../../docs/mockups/src/components/common/LinkTabs.module.css'
import { AppLink } from './AppLink'

export interface LinkTab {
  label: string
  to: string
  /** A count after the label, such as the number of changed files. */
  count?: number
  selected: boolean
}

/**
 * A row of tabs. Each tab is a link, so each view has its own address.
 * `wrap` puts the tabs in three columns, so that every tab shows on a phone.
 */
export function LinkTabs(props: {
  label: string
  tabs: readonly LinkTab[]
  wrap?: boolean
}) {
  return (
    <nav
      aria-label={props.label}
      className={classes(tabs.tabs, props.wrap && tabs.wrap)}
    >
      {props.tabs.map((tab) => (
        <AppLink
          aria-current={tab.selected ? 'page' : undefined}
          className={classes(tabs.tab, tab.selected && tabs.selected)}
          key={tab.label}
          to={tab.to}
        >
          {tab.label}
          {tab.count === undefined ? null : (
            <span className={tabs.count}>{tab.count}</span>
          )}
        </AppLink>
      ))}
    </nav>
  )
}

/** A link that opens a page outside the app in a new tab. */
export function ExternalLink(props: { href: string; children: ReactNode }) {
  return (
    <a
      className={external.link}
      href={props.href}
      rel="noreferrer"
      target="_blank"
    >
      {props.children}
      <ExternalLinkIcon aria-hidden size={12} />
    </a>
  )
}
