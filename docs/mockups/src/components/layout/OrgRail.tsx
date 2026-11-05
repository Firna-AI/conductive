import type { ReactNode } from 'react'
import { MockLink } from '@mokly/mokly'
import { Plus } from 'lucide-react'
import { orgList, type Org, type OrgKey } from '../../fixtures/orgs'
import { paths } from '../../paths'
import a11y from '../common/a11y.module.css'
import { classes } from '../common/classes'
import { Mark } from '../common/Mark'
import { orgLinks } from '../orgs/orgLinks'
import { AccountAvatar, OrgTile } from '../orgs/OrgTile'
import styles from './OrgRail.module.css'

export type RailState = {
  orgs: readonly Org[]
  /** The current org, or the create and account pages. */
  current?: OrgKey | 'create' | 'account'
  /** The org whose name shows beside it, as on hover. */
  hint?: OrgKey
  /** No org exists yet, and nothing is connected. */
  firstRun?: boolean
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
    <MockLink
      aria-current={props.current ? 'page' : undefined}
      aria-label={props.label}
      className={classes(styles.link, props.current && styles.current)}
      title={props.label}
      to={props.to}
    >
      {props.children}
    </MockLink>
  )
}

function OrgItem(props: { org: Org; current: boolean; hint: boolean }) {
  const { org } = props
  const to = orgLinks[org.key]
  const tile = <OrgTile current={props.current} org={org} size={26} />
  return (
    <li className={styles.item}>
      {to ? (
        <RailLink current={props.current} label={org.name} to={to}>
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
 * The narrow rail beside the sidebar: the orgs of the user, a way to create
 * another, and the account at the bottom.
 */
export function OrgRail(props: RailState) {
  return (
    <nav aria-label="Orgs" className={styles.rail}>
      <span className={styles.mark}>
        <Mark />
      </span>
      <ul className={styles.orgs}>
        {props.orgs.map((org) => (
          <OrgItem
            current={props.current === org.key}
            hint={props.hint === org.key}
            key={org.key}
            org={org}
          />
        ))}
        <li className={styles.item}>
          <RailLink
            current={props.current === 'create'}
            label="Create org"
            to={props.firstRun ? paths.createFirstOrg : paths.createOrg}
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
        <AccountAvatar size={24} />
      </RailLink>
    </nav>
  )
}
