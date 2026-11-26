import { Fragment } from 'react'
import { Gauge, Plus } from 'lucide-react'
import { defined } from '../../defined'
import { iconKeyOf } from '../../entries/components/common/icons'
import type { MenuEntryData } from '../../entries/components/common/menuEntries'
import type { Person } from '../../fixtures/members'
import { account, orgList, type Org, type OrgKey } from '../../fixtures/orgs'
import { shownShortcut } from '../../fixtures/shortcutChanges'
import { orgCommand } from '../../fixtures/shortcutCommands'
import { pageHost, type ShortcutHost } from '../../fixtures/shortcutHosts'
import { paths } from '../../paths'
import type { Shortcut } from '../../../../../src/ui/components/common/KeyChips'
import { classes } from '../../../../../src/ui/components/common/classes'
import { logoTile } from '../../entries/components/brand/Logo.mockup'
import { useMacApp } from '../../../../../src/ui/components/mac/MacApp'
import { placeAfterDrop, type OrgDrag } from '../orgs/OrgDrop'
import { orgDrop } from '../../entries/components/orgs/OrgDrop.mockup'
import { tileMenuItems } from '../../../../../src/ui/components/orgs/orgTileMenu'
import { personAvatar } from '../../entries/components/orgs/OrgTile.mockup'
import type { OrgState } from './RailItems'
import {
  orgItem,
  railLink,
  railTile,
} from '../../entries/components/layout/RailItems.mockup'
import styles from '../../../../../src/ui/components/layout/OrgRail.module.css'

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
  /**
   * An org that the person drags to another place, from decision 515 C.
   * Its tile stays as a faint copy, a line marks where it lands, and a
   * raised copy follows the pointer. The rail names no org during a drag.
   */
  drag?: OrgDrag
  /**
   * The org whose tile menu a right click opened, from decision 515 C. The
   * menu opens at the pointer, and the tile keeps the fill of a hover.
   */
  menu?: OrgKey
  /**
   * The workspace list of the hidden sidebar is open as a popover, from a
   * click on the tile of the current org.
   */
  popover?: boolean
}

/** The rail of the canonical views: every org, with Acme open. */
export const acmeRail: RailState = { orgs: orgList, current: 'acme' }

/** Whether an org of the rail is suspended. */
function orgState(rail: RailState, key: OrgKey): OrgState | undefined {
  if (rail.suspended === key) return 'suspended'
  return undefined
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

/**
 * The menu of the org tile at a place in the rail, as the registered menu
 * takes it: the move items, with the key of their icons.
 */
function tileMenu(place: number, count: number): MenuEntryData[] {
  return tileMenuItems(place, count).map((item) => ({
    kind: 'item',
    label: item.label,
    icon: iconKeyOf(item.icon),
    disabled: item.disabled,
  }))
}

/** The link of an operator to the operator page, above the account. */
function OperatorItem(props: { current: boolean; hint: boolean }) {
  return (
    <div className={classes(styles.item, styles.operator)}>
      <railLink.Component
        current={props.current}
        label="Operator"
        moklyInstance="operator"
        to={paths.operator}
      >
        <Gauge size={16} />
      </railLink.Component>
      {props.hint ? (
        <span aria-hidden className={styles.hint}>
          Operator
        </span>
      ) : null}
    </div>
  )
}

/**
 * The page that Create org opens: Get started on the first run, the form
 * with the account choice for an operator, and the form for anyone else.
 */
function createOrgLink(rail: RailState): string {
  if (rail.firstRun) return paths.getStarted
  return rail.operator ? paths.createOrgOperator : paths.createOrg
}

/**
 * The narrow rail beside the sidebar: the logo, the orgs of the user in
 * their own order, a way to create another, and the account at the bottom.
 * Deleted orgs appear in Account settings with Restore.
 * An operator also gets Operator above the account, and the account choice
 * on Create org. Each org tile moves by drag or by its menu. Create org,
 * Operator, and the account stay.
 * The hint of an org shows the key of its place, counted from the top,
 * on the keyboard of the page.
 */
export function OrgRail(props: RailState) {
  const host = pageHost(useMacApp() !== undefined)
  const { orgs, drag } = props
  const from = orgs.findIndex((org) => org.key === drag?.org)
  const dragged = orgs[from]
  const dropAt = (index: number) =>
    dragged && drag?.index === index ? (
      <orgDrop.Component
        at="rail"
        count={orgs.length}
        name={dragged.name}
        place={placeAfterDrop(from, index)}
      >
        <railTile.Component
          current={props.current === dragged.key}
          moklyInstance="lifted-tile"
          org={dragged}
        />
      </orgDrop.Component>
    ) : null
  return (
    <nav aria-label="Orgs" className={styles.rail}>
      <span className={styles.mark}>
        <logoTile.Component size={24} />
      </span>
      <ul className={styles.orgs}>
        {orgs.map((org, index) => (
          <Fragment key={org.key}>
            {dropAt(index)}
            <orgItem.Component
              current={props.current === org.key}
              hint={props.hint === org.key}
              moklyInstance={`org-${org.key}`}
              org={org}
              placeholder={org === dragged}
              {...defined({
                expanded: props.popover && props.current === org.key,
                menu:
                  props.menu === org.key
                    ? tileMenu(index, orgs.length)
                    : undefined,
                shortcut: orgShortcut(index, host),
                state: orgState(props, org.key),
              })}
            />
          </Fragment>
        ))}
        {dropAt(orgs.length)}
        <li className={styles.item}>
          <railLink.Component
            current={props.current === 'create'}
            label="Create org"
            moklyInstance="create-org"
            to={createOrgLink(props)}
          >
            <span className={styles.create}>
              <Plus size={15} />
            </span>
          </railLink.Component>
        </li>
      </ul>
      {props.operator ? (
        <OperatorItem
          current={props.current === 'operator'}
          hint={props.hint === 'operator'}
        />
      ) : null}
      <railLink.Component
        current={props.current === 'account'}
        label="Account"
        moklyInstance="account"
        to={props.firstRun ? paths.accountSetup : paths.account}
      >
        <personAvatar.Component
          initials={(props.person ?? account).initials}
          size={24}
        />
      </railLink.Component>
    </nav>
  )
}
