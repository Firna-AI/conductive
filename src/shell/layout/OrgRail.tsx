import type { ReactNode } from 'react'
import { Gauge, Plus } from 'lucide-react'
import { LogoTile } from '../../../docs/mockups/src/components/brand/Logo'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { KeyChips } from '../../../docs/mockups/src/components/common/KeyChips'
import styles from '../../../docs/mockups/src/components/layout/OrgRail.module.css'
import { orgCommand } from '../../app/palette/commands'
import { isSuspended } from '../../app/permissions'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import type { ShortcutCommandId } from '../../shared/shortcut-commands'
import { useApp } from '../context'
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
import layout from './layout.module.css'

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
function RailLink(props: {
  label: string
  to: string
  current: boolean
  hint?: ShortcutHint
  tip?: boolean
  children: ReactNode
}) {
  return (
    <AppLink
      aria-current={props.current ? 'page' : undefined}
      aria-keyshortcuts={props.hint?.aria}
      aria-label={props.label}
      className={classes(styles.link, props.current && styles.current)}
      title={props.tip ? shortcutTip(props.label, props.hint) : undefined}
      to={props.to}
    >
      {props.children}
    </AppLink>
  )
}

/**
 * An org of the rail, with the name of the org and the key that opens it
 * in its drawn hint. A screen reader hears the key on the link.
 */
function OrgItem(props: {
  org: OrgSummary
  current: boolean
  label: string
  /** Switch to org 1 to 9 of the place of the org, counted from the top. */
  command: ShortcutCommandId | null
}) {
  const { org } = props
  const hint = useShortcutHint(props.command ?? undefined)
  const tile = <OrgTile current={props.current} org={org} size={26} />
  return (
    <li className={classes(styles.item, layout.railItem)}>
      <RailLink
        current={props.current}
        hint={hint}
        label={props.label}
        to={routes.org(org.id)}
      >
        {org.deletion ? <span className={styles.deleted}>{tile}</span> : tile}
      </RailLink>
      <span aria-hidden className={classes(styles.hint, layout.railHint)}>
        {org.name}
        {hint ? (
          <span className={styles.hintKey}>
            <KeyChips shortcut={hint.text} />
          </span>
        ) : null}
      </span>
    </li>
  )
}

/**
 * Offers the keys of Switch to org 1 to 9 while the rail shows. Each key
 * opens the org at its place, counted from the top, as the tile does, also
 * a deleted org and the org of the page.
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
  const app = useApp()
  const refused = useStore(app.refusedOrgs)
  const createHint = useShortcutHint('create-org')
  const accountHint = useShortcutHint('account-page')
  useOrgKeys(props.orgs)
  return (
    <nav aria-label="Orgs" className={styles.rail}>
      <span className={styles.mark}>
        <LogoTile size={24} />
      </span>
      <ul className={styles.orgs}>
        {props.orgs.map((org, place) => (
          <OrgItem
            command={orgCommand(place)}
            current={org.id === currentOrg}
            key={org.id}
            label={
              org.deletion
                ? `${org.name}, deleted`
                : isSuspended(org, refused)
                  ? `${org.name}, suspended`
                  : org.name
            }
            org={org}
          />
        ))}
        <li className={styles.item}>
          <RailLink
            current={props.current === 'create'}
            hint={createHint}
            label="Create org"
            tip
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
        hint={accountHint}
        label="Account"
        tip
        to={routes.account()}
      >
        <PersonAvatar person={props.user} size={24} />
      </RailLink>
    </nav>
  )
}
