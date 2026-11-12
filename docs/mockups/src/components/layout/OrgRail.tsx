import type { ReactNode } from 'react'
import { Gauge, Plus } from 'lucide-react'
import type { Person } from '../../fixtures/members'
import { account, orgList, type Org, type OrgKey } from '../../fixtures/orgs'
import { shownShortcut } from '../../fixtures/shortcutChanges'
import { orgCommand } from '../../fixtures/shortcutCommands'
import { pageHost, type ShortcutHost } from '../../fixtures/shortcutHosts'
import { paths } from '../../paths'
import { KeyChips, type Shortcut } from '../common/KeyChips'
import { ScreenLink } from '../common/ScreenLink'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { LogoTile } from '../brand/Logo'
import { useMacApp } from '../mac/MacApp'
import { orgLinks } from '../orgs/orgLinks'
import { OrgTile, PersonAvatar } from '../orgs/OrgTile'
import styles from './OrgRail.module.css'

export type RailState = {
  orgs: readonly Org[]
  /** The current org, or the create, account, and operator pages. */
  current?: OrgKey | 'create' | 'account' | 'operator'
  /**
   * The org, or Operator, whose name shows beside it, as on hover. An org
   * also shows the key that opens it.
   */
  hint?: OrgKey | 'operator'
  /**
   * An org that the operator suspended. Its tile looks as before, because
   * its members still open it, and the org's pages show the notice.
   */
  suspended?: OrgKey
  /** No org exists yet, and nothing is connected. */
  firstRun?: boolean
  /**
   * The person signed in runs the app for everyone, so Operator shows
   * above the account. Nobody else sees it.
   */
  operator?: boolean
  /**
   * The person signed in. Without it, the rail shows the account of the
   * mockups.
   */
  person?: Person
}

/** The rail of the canonical views: every org, with Acme open. */
export const acmeRail: RailState = { orgs: orgList, current: 'acme' }

function RailLink(props: {
  label: string
  to: string
  current: boolean
  children: ReactNode
}) {
  return (
    <ScreenLink
      aria-current={props.current ? 'page' : undefined}
      aria-label={props.label}
      className={classes(styles.link, props.current && styles.current)}
      title={props.label}
      to={props.to}
    >
      {props.children}
    </ScreenLink>
  )
}

/** The page that an org of the rail opens, and the name of its link. */
function orgLink(org: Org, suspended: boolean): { to?: string; label: string } {
  return suspended
    ? { to: paths.suspendedOrg, label: `${org.name}, suspended` }
    : { to: orgLinks[org.key], label: org.name }
}

/**
 * The key that opens the org at a place in the rail, from 0: the first key
 * of its Switch to org command that works on the host. The rail draws the
 * default keys. An org after the ninth has no key.
 */
function orgShortcut(index: number, host: ShortcutHost): Shortcut | undefined {
  const command = orgCommand(index)
  return command === undefined ? undefined : shownShortcut(command, {}, host)
}

function OrgItem(props: {
  org: Org
  current: boolean
  hint: boolean
  /** The key that opens the org, which its hint shows. */
  shortcut?: Shortcut
  suspended: boolean
}) {
  const { org } = props
  const { to, label } = orgLink(org, props.suspended)
  const tile = <OrgTile current={props.current} org={org} size={26} />
  return (
    <li className={styles.item}>
      {to ? (
        <RailLink current={props.current} label={label} to={to}>
          {tile}
        </RailLink>
      ) : (
        <span className={styles.link} title={org.name}>
          {tile}
          <span className={a11y.hidden}>{org.name}</span>
        </span>
      )}
      {props.hint ? (
        <span aria-hidden className={styles.hint}>
          {org.name}
          {props.shortcut ? (
            <span className={styles.hintKey}>
              <KeyChips shortcut={props.shortcut} />
            </span>
          ) : null}
        </span>
      ) : null}
    </li>
  )
}

/** The link of an operator to the operator page, above the account. */
function OperatorItem(props: { current: boolean; hint: boolean }) {
  return (
    <div className={classes(styles.item, styles.operator)}>
      <RailLink current={props.current} label="Operator" to={paths.operator}>
        <Gauge size={16} />
      </RailLink>
      {props.hint ? (
        <span aria-hidden className={styles.hint}>
          Operator
        </span>
      ) : null}
    </div>
  )
}

/**
 * The narrow rail beside the sidebar: the logo, the orgs of the user, a
 * way to create another, and the account at the bottom. A deleted org
 * is not in the rail: the Account page lists it with Restore. An operator also
 * gets Operator above the account. The hint of an org shows the key of its
 * place, counted from the top, on the keyboard of the page.
 */
export function OrgRail(props: RailState) {
  const host = pageHost(useMacApp() !== undefined)
  return (
    <nav aria-label="Orgs" className={styles.rail}>
      <span className={styles.mark}>
        <LogoTile size={24} />
      </span>
      <ul className={styles.orgs}>
        {props.orgs.map((org, index) => (
          <OrgItem
            current={props.current === org.key}
            hint={props.hint === org.key}
            key={org.key}
            org={org}
            shortcut={orgShortcut(index, host)}
            suspended={props.suspended === org.key}
          />
        ))}
        <li className={styles.item}>
          <RailLink
            current={props.current === 'create'}
            label="Create org"
            to={props.firstRun ? paths.getStarted : paths.createOrg}
          >
            <span className={styles.create}>
              <Plus size={15} />
            </span>
          </RailLink>
        </li>
      </ul>
      {props.operator ? (
        <OperatorItem
          current={props.current === 'operator'}
          hint={props.hint === 'operator'}
        />
      ) : null}
      <RailLink
        current={props.current === 'account'}
        label="Account"
        to={props.firstRun ? paths.accountSetup : paths.account}
      >
        <PersonAvatar initials={(props.person ?? account).initials} size={24} />
      </RailLink>
    </nav>
  )
}
