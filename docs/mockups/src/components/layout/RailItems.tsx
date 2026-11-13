import type { ReactNode } from 'react'
import type { Org } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { KeyChips, type Shortcut } from '../common/KeyChips'
import { Menu, type MenuEntry } from '../common/Menu'
import { ScreenLink } from '../common/ScreenLink'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import orgDrag from '../orgs/OrgDrag.module.css'
import { orgLinks } from '../orgs/orgLinks'
import { OrgTile } from '../orgs/OrgTile'
import styles from './OrgRail.module.css'

export function RailLink(props: {
  label: string
  to: string
  current: boolean
  /** The tile menu of the link is open. */
  open?: boolean
  children: ReactNode
}) {
  return (
    <ScreenLink
      aria-current={props.current ? 'page' : undefined}
      aria-label={props.label}
      className={classes(
        styles.link,
        props.current && styles.current,
        props.open && styles.menuOpen,
      )}
      title={props.label}
      to={props.to}
    >
      {props.children}
    </ScreenLink>
  )
}

/**
 * An org of the rail that the operator suspended. A deleted org has no
 * tile: the Account page lists it, with Restore.
 */
export type OrgState = 'suspended'

/** The page that an org of the rail opens, and the name of its link. */
function orgLink(
  org: Org,
  state: OrgState | undefined,
): { to?: string; label: string } {
  switch (state) {
    case 'suspended':
      return { to: paths.suspendedOrg, label: `${org.name}, suspended` }
    case undefined:
      return { to: orgLinks[org.key], label: org.name }
  }
}

/** The square of an org in the rail. */
export function RailTile(props: { org: Org; current: boolean }) {
  return <OrgTile current={props.current} org={props.org} size={26} />
}

/**
 * The tile of an org. A tile in the middle of a drag stays as a faint copy,
 * which links nowhere. A tile with an open menu shows the menu at the
 * pointer of the right click.
 */
export function OrgItem(props: {
  org: Org
  current: boolean
  hint: boolean
  /** The key that opens the org, which its hint shows. */
  shortcut?: Shortcut
  state?: OrgState
  placeholder?: boolean
  menu?: readonly MenuEntry[]
}) {
  const { org, menu } = props
  const { to, label } = orgLink(org, props.state)
  const tile = <RailTile current={props.current} org={org} />
  return (
    <li className={styles.item}>
      {to && !props.placeholder ? (
        <RailLink
          current={props.current}
          label={label}
          open={menu !== undefined}
          to={to}
        >
          {tile}
        </RailLink>
      ) : (
        <span
          className={classes(
            styles.link,
            props.placeholder && props.current && styles.current,
            props.placeholder && orgDrag.placeholder,
            menu && styles.menuOpen,
          )}
          title={org.name}
        >
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
      {menu ? (
        <span className={styles.pointer}>
          <Menu entries={menu} label={org.name} placement="point" />
        </span>
      ) : null}
    </li>
  )
}
