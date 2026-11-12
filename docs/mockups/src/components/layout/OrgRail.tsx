import { Fragment } from 'react'
import { Gauge, Plus } from 'lucide-react'
import type { Person } from '../../fixtures/members'
import { account, orgList, type Org, type OrgKey } from '../../fixtures/orgs'
import { paths } from '../../paths'
import { classes } from '../common/classes'
import { LogoTile } from '../brand/Logo'
import { OrgDrop, placeAfterDrop, type OrgDrag } from '../orgs/OrgDrop'
import { tileMenuOf } from '../orgs/orgTileMenu'
import { PersonAvatar } from '../orgs/OrgTile'
import { OrgItem, RailLink, RailTile, type OrgState } from './RailItems'
import styles from './OrgRail.module.css'

export type RailState = {
  orgs: readonly Org[]
  /** The current org, or the create, account, and operator pages. */
  current?: OrgKey | 'create' | 'account' | 'operator'
  /** The org, or Operator, whose name shows beside it, as on hover. */
  hint?: OrgKey | 'operator'
  /** An org that an admin deleted, which waits for its restore. */
  deleted?: OrgKey
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
}

/** The rail of the canonical views: every org, with Acme open. */
export const acmeRail: RailState = { orgs: orgList, current: 'acme' }

/** Whether an org of the rail is deleted or suspended. */
function orgState(rail: RailState, key: OrgKey): OrgState | undefined {
  if (rail.deleted === key) return 'deleted'
  if (rail.suspended === key) return 'suspended'
  return undefined
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
 * The narrow rail beside the sidebar: the logo, the orgs of the user in
 * their own order, a way to create another, and the account at the bottom.
 * An operator also gets Operator above the account. Each org tile moves by
 * drag or by its menu. Create org, Operator, and the account stay.
 */
export function OrgRail(props: RailState) {
  const { orgs, drag } = props
  const from = orgs.findIndex((org) => org.key === drag?.org)
  const dragged = orgs[from]
  const dropAt = (index: number) =>
    dragged && drag?.index === index ? (
      <OrgDrop
        at="rail"
        count={orgs.length}
        name={dragged.name}
        place={placeAfterDrop(from, index)}
      >
        <RailTile
          current={props.current === dragged.key}
          org={dragged}
          state={orgState(props, dragged.key)}
        />
      </OrgDrop>
    ) : null
  return (
    <nav aria-label="Orgs" className={styles.rail}>
      <span className={styles.mark}>
        <LogoTile size={24} />
      </span>
      <ul className={styles.orgs}>
        {orgs.map((org, index) => (
          <Fragment key={org.key}>
            {dropAt(index)}
            <OrgItem
              current={props.current === org.key}
              hint={props.hint === org.key}
              menu={
                props.menu === org.key
                  ? tileMenuOf(index, orgs.length)
                  : undefined
              }
              org={org}
              placeholder={org === dragged}
              state={orgState(props, org.key)}
            />
          </Fragment>
        ))}
        {dropAt(orgs.length)}
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
