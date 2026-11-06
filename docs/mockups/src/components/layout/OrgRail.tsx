import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import type { Person } from '../../fixtures/members'
import { account, orgList, type Org, type OrgKey } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { ScreenLink } from '../common/ScreenLink'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { LogoTile } from '../brand/Logo'
import { orgLinks } from '../orgs/orgLinks'
import { OrgTile, PersonAvatar } from '../orgs/OrgTile'
import styles from './OrgRail.module.css'

export type RailState = {
  orgs: readonly Org[]
  /** The current org, or the create and account pages. */
  current?: OrgKey | 'create' | 'account'
  /** The org whose name shows beside it, as on hover. */
  hint?: OrgKey
  /** An org that an admin deleted, which waits for its restore. */
  deleted?: OrgKey
  /** No org exists yet, and nothing is connected. */
  firstRun?: boolean
  /** The person signed in, when it is not the account of the mockups. */
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

function OrgItem(props: {
  org: Org
  current: boolean
  hint: boolean
  deleted: boolean
}) {
  const { org } = props
  const to = props.deleted ? paths.deletedOrg : orgLinks[org.key]
  const avatar = <OrgTile current={props.current} org={org} size={26} />
  const tile = props.deleted ? (
    <span className={styles.deleted}>{avatar}</span>
  ) : (
    avatar
  )
  return (
    <li className={styles.item}>
      {to ? (
        <RailLink
          current={props.current}
          label={props.deleted ? `${org.name}, deleted` : org.name}
          to={to}
        >
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
        </span>
      ) : null}
    </li>
  )
}

/**
 * The narrow rail beside the sidebar: the logo, the orgs of the user, a
 * way to create another, and the account at the bottom.
 */
export function OrgRail(props: RailState) {
  return (
    <nav aria-label="Orgs" className={styles.rail}>
      <span className={styles.mark}>
        <LogoTile size={24} />
      </span>
      <ul className={styles.orgs}>
        {props.orgs.map((org) => (
          <OrgItem
            current={props.current === org.key}
            deleted={props.deleted === org.key}
            hint={props.hint === org.key}
            key={org.key}
            org={org}
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
