import type { ReactNode } from 'react'
import { Check, Gauge, Plus } from 'lucide-react'
import { Menu } from '../components/common/Menu'
import { ScreenLink } from '../components/common/ScreenLink'
import { Sheet } from '../components/common/Sheet'
import { orgLinks } from '../components/orgs/orgLinks'
import { AccountAvatar, OrgTile } from '../components/orgs/OrgTile'
import { sectionMenu } from '../components/workspaces/menus'
import type { RowMenuOpen } from '../components/workspaces/RowMenu'
import { orgList, type OrgKey } from '../fixtures/orgs'
import { menuSection, sections } from '../fixtures/sections'
import { paths } from '../paths'
import styles from './WorkspaceListScreen.module.css'

function SheetRow(props: {
  to?: string
  current?: boolean
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
  if (!props.to) return <div className={styles.sheetRow}>{content}</div>
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

/**
 * The org switcher of a phone, which has no rail: every org, a way to
 * create one, and the account. An operator also gets Operator under the
 * account.
 */
export function OrgSwitcherSheet(props: {
  current: OrgKey
  operator?: boolean
}) {
  return (
    <Sheet title="Orgs">
      <nav aria-label="Orgs">
        <ul className={styles.sheetList}>
          {orgList.map((org) => (
            <li key={org.key}>
              <SheetRow
                current={org.key === props.current}
                to={orgLinks[org.key]}
              >
                <OrgTile
                  current={org.key === props.current}
                  org={org}
                  size={26}
                />
                <span className={styles.sheetLabel}>{org.name}</span>
              </SheetRow>
            </li>
          ))}
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
