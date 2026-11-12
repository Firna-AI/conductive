import { Fragment, type ReactNode, type Ref } from 'react'
import { Gauge, Plus } from 'lucide-react'
import { LogoTile } from '../../../docs/mockups/src/components/brand/Logo'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import styles from '../../../docs/mockups/src/components/layout/OrgRail.module.css'
import orgDrag from '../../../docs/mockups/src/components/orgs/OrgDrag.module.css'
import { isSuspended } from '../../app/permissions'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useApp } from '../context'
import list from '../list/list.module.css'
import { LiftedOrg, OrgDropLine } from '../orgs/OrgDragParts'
import { AppLink } from '../ui/AppLink'
import { OrgTile, PersonAvatar } from '../ui/Avatars'
import ui from '../ui/ui.module.css'
import layout from './layout.module.css'
import { useRailOrder } from './useRailOrder'

/**
 * What the rail marks as current: an org, Create org, the account, or the
 * operator section.
 */
export type RailCurrent =
  { org: string } | 'create' | 'account' | 'operator' | null

function RailLink({
  linkRef,
  ...props
}: {
  label: string
  to: string
  current: boolean
  className?: string
  /** The link, which takes the focus back after a move of its tile. */
  linkRef?: Ref<HTMLAnchorElement>
  children: ReactNode
}) {
  return (
    <AppLink
      aria-current={props.current ? 'page' : undefined}
      aria-label={props.label}
      className={classes(
        styles.link,
        props.current && styles.current,
        props.className,
      )}
      ref={linkRef}
      to={props.to}
    >
      {props.children}
    </AppLink>
  )
}

/** The name of an item of the rail, which shows on hover and on focus. */
function RailHint(props: { name: string }) {
  return (
    <span aria-hidden className={classes(styles.hint, layout.railHint)}>
      {props.name}
    </span>
  )
}

/** The square of an org in the rail. A deleted org fades. */
function RailTile(props: { org: OrgSummary; current: boolean }) {
  const tile = <OrgTile current={props.current} org={props.org} size={26} />
  if (!props.org.deletion) return tile
  return <span className={styles.deleted}>{tile}</span>
}

/** The link of an operator to the operator section, above the account. */
function OperatorItem(props: { current: boolean; hint: boolean }) {
  return (
    <div className={classes(styles.item, styles.operator, layout.railItem)}>
      <RailLink current={props.current} label="Operator" to={routes.operator()}>
        <Gauge aria-hidden size={16} />
      </RailLink>
      {props.hint ? <RailHint name="Operator" /> : null}
    </div>
  )
}

/**
 * The narrow rail beside the sidebar: the logo, the orgs of the user in
 * their own order, Create org, and the account at the bottom. Each org tile
 * moves by drag, by its tile menu, or by Alt and Up or Down, as
 * `useRailOrder` says, and the rail shows no name during a drag. A deleted
 * org stays faded for its admins until the day when everything is deleted.
 * A suspended org looks the same, and the name of its link says that it is
 * suspended. An operator also gets Operator above the account. Nobody else
 * sees it.
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
  const order = useRailOrder(props.orgs)
  const { drag } = order
  const labelOf = (org: OrgSummary) => {
    if (org.deletion) return `${org.name}, deleted`
    return isSuspended(org, refused) ? `${org.name}, suspended` : org.name
  }
  return (
    <nav aria-label="Orgs" className={styles.rail}>
      <span className={styles.mark}>
        <LogoTile size={24} />
      </span>
      <span className={ui.hidden} role="status">
        {order.status}
      </span>
      <ul className={styles.orgs}>
        {props.orgs.map((org, index) => {
          const current = org.id === currentOrg
          return (
            <Fragment key={org.id}>
              {drag.lineBefore === org.id ? <OrgDropLine at="rail" /> : null}
              <li
                {...order.tile(org, index)}
                className={classes(
                  styles.item,
                  layout.railItem,
                  list.dragSurface,
                )}
              >
                <RailLink
                  className={classes(
                    order.menuOpen === org.id && styles.menuOpen,
                    drag.dragged?.id === org.id && orgDrag.placeholder,
                  )}
                  current={current}
                  label={labelOf(org)}
                  linkRef={order.linkRef(org.id)}
                  to={routes.org(org.id)}
                >
                  <RailTile current={current} org={org} />
                </RailLink>
                {drag.dragged ? null : <RailHint name={org.name} />}
              </li>
            </Fragment>
          )
        })}
        {drag.lineAtEnd ? <OrgDropLine at="rail" /> : null}
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
        <OperatorItem
          current={props.current === 'operator'}
          hint={drag.dragged === null}
        />
      ) : null}
      <RailLink
        current={props.current === 'account'}
        label="Account"
        to={routes.account()}
      >
        <PersonAvatar person={props.user} size={24} />
      </RailLink>
      {drag.dragged && drag.lifted ? (
        <LiftedOrg at="rail" frame={drag.lifted}>
          <RailTile
            current={drag.dragged.id === currentOrg}
            org={drag.dragged}
          />
        </LiftedOrg>
      ) : null}
      {order.menu}
    </nav>
  )
}
