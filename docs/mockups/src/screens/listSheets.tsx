import { Fragment, type ReactNode } from 'react'
import { Check, Gauge, Plus } from 'lucide-react'
import { classes } from '../components/common/classes'
import { Menu } from '../components/common/Menu'
import { ScreenLink } from '../components/common/ScreenLink'
import { Sheet } from '../components/common/Sheet'
import orgDrag from '../components/orgs/OrgDrag.module.css'
import {
  OrgDrop,
  placeAfterDrop,
  type OrgDrag,
} from '../components/orgs/OrgDrop'
import { orgLinks } from '../components/orgs/orgLinks'
import { AccountAvatar, OrgTile } from '../components/orgs/OrgTile'
import { sectionMenu } from '../components/workspaces/menus'
import type { RowMenuOpen } from '../components/workspaces/RowMenu'
import { orgList, type Org, type OrgKey } from '../fixtures/orgs'
import { menuSection, sections } from '../fixtures/sections'
import { paths } from '../paths'
import styles from './WorkspaceListScreen.module.css'

/** A row of a sheet. Without `to` it links nowhere, as a faint copy. */
function SheetRow(props: {
  to?: string
  current?: boolean
  faint?: boolean
  children: ReactNode
}) {
  const content = (
    <>
      {props.children}
      {props.current ? (
        <Check aria-hidden className={styles.check} size={15} />
      ) : null}
    </>
  )
  if (!props.to) {
    return (
      <div
        className={classes(styles.sheetRow, props.faint && orgDrag.placeholder)}
      >
        {content}
      </div>
    )
  }
  return (
    <ScreenLink
      aria-current={props.current ? 'page' : undefined}
      className={styles.sheetRow}
      to={props.to}
    >
      {content}
    </ScreenLink>
  )
}

/** The square and the name of an org, in a row of the org switcher. */
function OrgRowContent(props: { org: Org; current: boolean }) {
  return (
    <>
      <OrgTile current={props.current} org={props.org} size={26} />
      <span className={styles.sheetLabel}>{props.org.name}</span>
    </>
  )
}

/**
 * The org switcher of a phone, which has no rail: every org in the order
 * of the person, a way to create one, and the account. An operator also
 * gets Operator under the account. `drag` draws an org that a long press
 * lifted, from decision 515 C: a faint copy stays at its place, a line
 * marks where it lands, and a raised copy of its row follows the finger.
 */
export function OrgSwitcherSheet(props: {
  current: OrgKey
  operator?: boolean
  orgs?: readonly Org[]
  drag?: OrgDrag
}) {
  const orgs = props.orgs ?? orgList
  const from = orgs.findIndex((org) => org.key === props.drag?.org)
  const dragged = orgs[from]
  const dropAt = (index: number) =>
    dragged && props.drag?.index === index ? (
      <OrgDrop
        at="sheet"
        count={orgs.length}
        name={dragged.name}
        place={placeAfterDrop(from, index)}
      >
        <SheetRow current={dragged.key === props.current}>
          <OrgRowContent
            current={dragged.key === props.current}
            org={dragged}
          />
        </SheetRow>
      </OrgDrop>
    ) : null
  return (
    <Sheet title="Orgs">
      <nav aria-label="Orgs">
        <ul className={styles.sheetList}>
          {orgs.map((org, index) => (
            <Fragment key={org.key}>
              {dropAt(index)}
              <li>
                <SheetRow
                  current={org.key === props.current}
                  faint={org === dragged}
                  to={org === dragged ? undefined : orgLinks[org.key]}
                >
                  <OrgRowContent
                    current={org.key === props.current}
                    org={org}
                  />
                </SheetRow>
              </li>
            </Fragment>
          ))}
          {dropAt(orgs.length)}
          <li>
            <SheetRow to={paths.createOrg}>
              <span className={styles.createTile}>
                <Plus aria-hidden size={15} />
              </span>
              <span className={styles.sheetLabel}>Create org</span>
            </SheetRow>
          </li>
        </ul>
        <hr className={styles.sheetDivider} />
        <SheetRow to={paths.account}>
          <AccountAvatar size={26} />
          <span className={styles.sheetLabel}>Account</span>
        </SheetRow>
        {props.operator ? (
          <SheetRow to={paths.operator}>
            <span className={styles.operatorTile}>
              <Gauge aria-hidden size={15} />
            </span>
            <span className={styles.sheetLabel}>Operator</span>
          </SheetRow>
        ) : null}
      </nav>
    </Sheet>
  )
}

/** The menu of a section, as a phone shows it. */
export function SectionSheet() {
  const section = sections[menuSection]
  return (
    <Sheet title={section.name}>
      <Menu entries={sectionMenu} label={section.name} placement="sheet" />
    </Sheet>
  )
}

/**
 * The menu of a workspace row, as a phone layout shows it after a right
 * click or the menu keys: a sheet with the name of the workspace. A choice
 * with a submenu, such as Move to section, shows its choices in the sheet
 * in place of the menu.
 */
export function WorkspaceMenuSheet(props: { menu: RowMenuOpen }) {
  const { menu } = props
  const shown = menu.submenu ?? menu
  return (
    <Sheet title={menu.label}>
      <Menu entries={shown.entries} label={shown.label} placement="sheet" />
    </Sheet>
  )
}
