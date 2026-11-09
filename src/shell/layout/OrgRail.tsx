import type { ReactNode } from 'react'
import { Gauge, Plus } from 'lucide-react'
import { LogoTile } from '../../../docs/mockups/src/components/brand/Logo'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/layout/OrgRail.module.css'
import { isSuspended } from '../../app/permissions'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useApp } from '../context'
import { AppLink } from '../ui/AppLink'
import { OrgTile, PersonAvatar } from '../ui/Avatars'
import layout from './layout.module.css'

/**
 * What the rail marks as current: an org, Create org, the account, or the
 * operator section.
 */
export type RailCurrent =
  { org: string } | 'create' | 'account' | 'operator' | null

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

/** The link of an operator to the operator section, above the account. */
function OperatorItem(props: { current: boolean }) {
  return (
    <div className={classes(styles.item, styles.operator, layout.railItem)}>
      <RailLink current={props.current} label="Operator" to={routes.operator()}>
        <Gauge aria-hidden size={16} />
      </RailLink>
      <span aria-hidden className={classes(styles.hint, layout.railHint)}>
        Operator
      </span>
    </div>
  )
}

/**
 * The narrow rail beside the sidebar: the logo, the orgs of the user, Create
 * org, and the account at the bottom. A deleted org stays faded for its
 * admins until the day when everything is deleted. A suspended org looks
 * the same, and the name of its link says that it is suspended. An
 * operator also gets Operator above the account. Nobody else sees it.
 */
export function OrgRail(props: {
  orgs: readonly OrgSummary[]
  current: RailCurrent
  user: User
  /** Get started has not finished, so Create org leads back to it. */
  firstRun: boolean
  /** The person signed in runs the app for everyone. */
  operator: boolean
}) {
  const currentOrg =
    props.current !== null && typeof props.current === 'object'
      ? props.current.org
      : null
  const refused = useStore(useApp().refusedOrgs)
  return (
    <nav aria-label="Orgs" className={styles.rail}>
      <span className={styles.mark}>
        <LogoTile size={24} />
      </span>
      <ul className={styles.orgs}>
        {props.orgs.map((org) => {
          const current = org.id === currentOrg
          const label = org.deletion
            ? `${org.name}, deleted`
            : isSuspended(org, refused)
              ? `${org.name}, suspended`
              : org.name
          const tile = <OrgTile current={current} org={org} size={26} />
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
      {props.operator ? (
        <OperatorItem current={props.current === 'operator'} />
      ) : null}
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
