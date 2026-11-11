import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { devHref, type DevOptions, type DevView } from './devOptions'
import styles from './DevHost.module.css'

/**
 * On desktop, blank columns as wide as the org rail and the sidebar of
 * Milestone 6, so the main area sits where the mockups draw it.
 */
function Shell(props: {
  options: DevOptions
  /** A deleted org has no sidebar, so its page has only the rail. */
  sidebar?: boolean
  children: ReactNode
}) {
  if (props.options.viewport === 'mobile') return props.children
  return (
    <div className={styles.shell}>
      <div aria-hidden className={styles.rail} />
      {props.sidebar === false ? null : (
        <div aria-hidden className={styles.sidebar} />
      )}
      {props.children}
    </div>
  )
}

const settingsTabs: readonly { view: DevView; label: string }[] = [
  { view: 'general', label: 'General' },
  { view: 'repositories', label: 'Repositories' },
  { view: 'computer', label: 'Cloud computer' },
  { view: 'members', label: 'Members' },
]

/**
 * A stand-in for the page of the org settings, which Milestone 6 builds:
 * the header, the tabs as links, and the page column. It places the parts
 * of the members UI as the mockups do. Only the dev page uses it.
 */
export function DevSettingsFrame(props: {
  options: DevOptions
  orgName: string
  children: ReactNode
}) {
  const { options } = props
  const mobile = options.viewport === 'mobile'
  return (
    <Shell options={options}>
      <div className={mobile ? styles.mobile : styles.frame}>
        <header className={mobile ? styles.mobileHeader : styles.header}>
          {mobile ? (
            <ChevronLeft aria-hidden className={styles.back} size={15} />
          ) : null}
          <div className={mobile ? styles.mobileTitles : styles.titles}>
            <h1 className={styles.title}>{props.orgName}</h1>
            <span className={styles.subtitle}>Org settings</span>
          </div>
        </header>
        <nav
          aria-label="Org settings"
          className={mobile ? styles.mobileTabs : styles.tabs}
        >
          {settingsTabs.map((tab) => (
            <a
              aria-current={tab.view === options.view ? 'page' : undefined}
              className={
                tab.view === options.view
                  ? `${styles.tab} ${styles.selected}`
                  : styles.tab
              }
              href={devHref(options, tab.view)}
              key={tab.view}
            >
              {tab.label}
            </a>
          ))}
        </nav>
        <div className={mobile ? styles.mobileBody : styles.body}>
          <div className={mobile ? styles.mobileColumn : styles.column}>
            {props.children}
          </div>
        </div>
      </div>
    </Shell>
  )
}

/** A stand-in for the workspace header of Milestone 6, around the owner. */
export function DevWorkspaceFrame(props: {
  options: DevOptions
  name: string
  branch: string
  owner: ReactNode
}) {
  const mobile = props.options.viewport === 'mobile'
  return (
    <Shell options={props.options}>
      <div className={mobile ? styles.mobile : styles.frame}>
        <header className={mobile ? styles.mobileHeader : styles.header}>
          {mobile ? (
            <ChevronLeft aria-hidden className={styles.back} size={15} />
          ) : null}
          <div className={mobile ? styles.mobileTitles : styles.titles}>
            <h1 className={styles.title}>{props.name}</h1>
            <span className={styles.branch}>
              acme/storefront · {props.branch}
            </span>
          </div>
          {props.owner}
          {mobile ? <span className={styles.state}>Ready</span> : null}
        </header>
        <div className={styles.placeholder} />
      </div>
      {mobile ? null : <div aria-hidden className={styles.rightColumn} />}
    </Shell>
  )
}

/** A stand-in for the main area of the app, which a page fills. */
export function DevMainFrame(props: {
  options: DevOptions
  children: ReactNode
}) {
  const mobile = props.options.viewport === 'mobile'
  return (
    <Shell options={props.options} sidebar={false}>
      <main className={mobile ? styles.mobile : styles.frame}>
        {props.children}
      </main>
    </Shell>
  )
}

/** A line on the dev page for a part that another milestone builds. */
export function DevNote(props: { children: ReactNode }) {
  return <p className={styles.note}>{props.children}</p>
}
