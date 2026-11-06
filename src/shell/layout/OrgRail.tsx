import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import appIcon from '../../../docs/brand/conducting-icon.svg'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/layout/OrgRail.module.css'
import { routes } from '../../app/router'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { AppLink } from '../ui/AppLink'
import { OrgTile, PersonAvatar } from '../ui/Avatars'
import layout from './layout.module.css'

/** What the rail marks as current: an org, Create org, or the account. */
export type RailCurrent = { org: string } | 'create' | 'account' | null

function RailLink(props: {
  label: string
  to: string
  current: boolean
  children: ReactNode
}) {
  return (
    <AppLink
      aria-current={props.current ? 'page' : undefined}
      aria-label={props.label}
      className={classes(styles.link, props.current && styles.current)}
      to={props.to}
    >
      {props.children}
    </AppLink>
  )
}

/**
 * The narrow rail beside the sidebar: the logo, the orgs of the user, Create
 * org, and the account at the bottom. A deleted org stays faded for its
 * admins until the day when everything is deleted.
 */
export function OrgRail(props: {
  orgs: readonly OrgSummary[]
  current: RailCurrent
  user: User
  /** Get started has not finished, so Create org leads back to it. */
  firstRun: boolean
}) {
  const currentOrg =
    props.current !== null && typeof props.current === 'object'
      ? props.current.org
      : null
  return (
    <nav aria-label="Orgs" className={styles.rail}>
      <span className={styles.mark}>
        <img alt="" height={28} src={appIcon} width={28} />
      </span>
      <ul className={styles.orgs}>
        {props.orgs.map((org) => {
          const current = org.id === currentOrg
          const label = org.deletion ? `${org.name}, deleted` : org.name
          const tile = <OrgTile current={current} name={org.name} size={26} />
          return (
            <li className={classes(styles.item, layout.railItem)} key={org.id}>
              <RailLink current={current} label={label} to={routes.org(org.id)}>
                {org.deletion ? (
                  <span className={styles.deleted}>{tile}</span>
                ) : (
                  tile
                )}
              </RailLink>
              <span
                aria-hidden
                className={classes(styles.hint, layout.railHint)}
              >
                {org.name}
              </span>
            </li>
          )
        })}
        <li className={styles.item}>
          <RailLink
            current={props.current === 'create'}
            label="Create org"
            to={props.firstRun ? routes.getStarted() : routes.createOrg()}
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
        to={routes.account()}
      >
        <PersonAvatar person={props.user} size={24} />
      </RailLink>
    </nav>
  )
}
