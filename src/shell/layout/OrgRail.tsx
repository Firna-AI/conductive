import { Fragment, type ReactNode, type Ref } from 'react'
import { Gauge, Plus } from 'lucide-react'
import { LogoTile } from '../../../docs/mockups/src/components/brand/Logo'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { KeyChips } from '../../../docs/mockups/src/components/common/KeyChips'
import { orgCommand } from '../../app/palette/commands'
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
import {
  useShortcutOffers,
  type CommandOffer,
} from '../shortcuts/shortcut-context'
import {
  shortcutTip,
  useShortcutHint,
  type ShortcutHint,
} from '../shortcuts/shortcut-hints'
import { AppLink, useOpenPage } from '../ui/AppLink'
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

/**
 * A link of the rail. A link that runs a command of the keys names the key
 * of its hint to a screen reader. `tip` gives it a tooltip with the label
 * and the key, for a link without the drawn hint of an org.
 */
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
  hint?: ShortcutHint
  tip?: boolean
  children: ReactNode
}) {
  return (
    <AppLink
      aria-current={props.current ? 'page' : undefined}
      aria-keyshortcuts={props.hint?.aria}
      aria-label={props.label}
      className={classes(
        styles.link,
        props.current && styles.current,
        props.className,
      )}
      ref={linkRef}
      title={props.tip ? shortcutTip(props.label, props.hint) : undefined}
      to={props.to}
    >
      {props.children}
    </AppLink>
  )
}

/** The name of an item of the rail, which shows on hover and on keyboard focus. */
function RailHint(props: { name: string; hint?: ShortcutHint }) {
  return (
    <span aria-hidden className={classes(styles.hint, layout.railHint)}>
      {props.name}
      {props.hint ? (
        <span className={styles.hintKey}>
          <KeyChips shortcut={props.hint.text} />
        </span>
      ) : null}
    </span>
  )
}

/**
 * Offers the keys of Switch to org 1 to 9 while the rail shows. Each key
 * opens the org at its place, counted from the top, as the tile does, also
 * the org of the page.
 */
function useOrgKeys(orgs: readonly OrgSummary[]): void {
  const open = useOpenPage()
  useShortcutOffers(
    orgs.flatMap((org, place): CommandOffer[] => {
      const command = orgCommand(place)
      if (command === null) return []
      return [{ command, run: () => open(routes.org(org.id)) }]
    }),
  )
}

/**
 * An org of the rail, with the name of the org and the key that opens it
 * in its drawn hint. A screen reader hears the key on the link.
 */
function OrderedOrg(props: {
  org: OrgSummary
  index: number
  current: boolean
  label: string
  order: ReturnType<typeof useRailOrder>
}) {
  const { org, index, current, order } = props
  const hint = useShortcutHint(orgCommand(index) ?? undefined)
  return (
    <li
      {...order.tile(org, index)}
      className={classes(styles.item, layout.railItem, list.dragSurface)}
    >
      <RailLink
        className={classes(
          order.menuOpen === org.id && styles.menuOpen,
          order.drag.dragged?.id === org.id && orgDrag.placeholder,
        )}
        current={current}
        hint={hint}
        label={props.label}
        linkRef={order.linkRef(org.id)}
        to={routes.org(org.id)}
      >
        <OrgTile current={current} org={org} size={26} />
      </RailLink>
      {order.drag.dragged ? null : <RailHint name={org.name} hint={hint} />}
    </li>
  )
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
 * org appears in Account settings with Restore.
 * A suspended org looks the same, and the name of its link says that it is
 * suspended. An operator also gets Operator above the account. Nobody else
 * sees it.
 * While the rail shows, the keys of Switch to org 1 to 9 open its orgs.
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
  const createHint = useShortcutHint('create-org')
  const accountHint = useShortcutHint('account-page')
  useOrgKeys(props.orgs)
  const order = useRailOrder(props.orgs)
  const { drag } = order
  const labelOf = (org: OrgSummary) =>
    isSuspended(org, refused) ? `${org.name}, suspended` : org.name
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
              <OrderedOrg
                org={org}
                index={index}
                current={current}
                label={labelOf(org)}
                order={order}
              />
            </Fragment>
          )
        })}
        {drag.lineAtEnd ? <OrgDropLine at="rail" /> : null}
        <li className={styles.item}>
          <RailLink
            current={props.current === 'create'}
            hint={createHint}
            tip
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
        hint={accountHint}
        tip
        label="Account"
        to={routes.account()}
      >
        <PersonAvatar person={props.user} size={24} />
      </RailLink>
      {drag.dragged && drag.lifted ? (
        <LiftedOrg at="rail" frame={drag.lifted}>
          <OrgTile
            current={drag.dragged.id === currentOrg}
            org={drag.dragged}
            size={26}
          />
        </LiftedOrg>
      ) : null}
      {order.menu}
    </nav>
  )
}
