import { useState } from 'react'
import { Check, ChevronDown, Plus } from 'lucide-react'
import styles from '../../../docs/mockups/src/screens/WorkspaceListScreen.module.css'
import { routes } from '../../app/router'
import { useStore } from '../../app/store'
import type { User } from '../../shared/api'
import type { OrgSummary } from '../../shared/orgs'
import { useApp } from '../context'
import { AppLink } from '../ui/AppLink'
import { OrgTile, PersonAvatar } from '../ui/Avatars'
import { Sheet } from '../ui/Sheet'
import ui from '../ui/ui.module.css'
import { NewWorkspaceLink, SettingsLink } from './Sidebar'
import { OrgList } from './OrgList'

/** The org switcher of a phone, which has no rail. */
function OrgSwitcherSheet(props: {
  current: string
  user: User
  close: () => void
}) {
  const orgs = useStore(useApp().orgs)
  return (
    <Sheet close={props.close} title="Orgs">
      <nav aria-label="Orgs">
        <ul className={styles.sheetList}>
          {orgs.map((org) => (
            <li key={org.id}>
              <AppLink
                aria-current={org.id === props.current ? 'page' : undefined}
                className={styles.sheetRow}
                onClick={props.close}
                to={routes.org(org.id)}
              >
                <OrgTile
                  current={org.id === props.current}
                  org={org}
                  size={26}
                />
                <span className={styles.sheetLabel}>
                  {org.deletion ? `${org.name}, deleted` : org.name}
                </span>
                {org.id === props.current ? (
                  <Check aria-hidden className={styles.check} size={15} />
                ) : null}
              </AppLink>
            </li>
          ))}
          <li>
            <AppLink
              className={styles.sheetRow}
              onClick={props.close}
              to={routes.createOrg()}
            >
              <span className={styles.createTile}>
                <Plus aria-hidden size={15} />
              </span>
              <span className={styles.sheetLabel}>Create org</span>
            </AppLink>
          </li>
        </ul>
        <hr className={styles.sheetDivider} />
        <AppLink
          className={styles.sheetRow}
          onClick={props.close}
          to={routes.account()}
        >
          <PersonAvatar person={props.user} size={26} />
          <span className={styles.sheetLabel}>Account</span>
        </AppLink>
      </nav>
    </Sheet>
  )
}

/**
 * The header of the list page. A phone has no rail, so the org name opens
 * the org switcher. A deleted org has no settings to open.
 */
export function ListHeader(props: {
  org: OrgSummary
  user: User
  settings: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <header className={styles.header}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`${styles.switcher} ${ui.plainButton}`}
        onClick={() => setOpen(true)}
        type="button"
      >
        <OrgTile current org={props.org} size={24} />
        <span className={ui.hidden}>Switch org: </span>
        <span className={styles.orgName}>{props.org.name}</span>
        <ChevronDown aria-hidden className={styles.chevron} size={15} />
      </button>
      {props.settings ? (
        <SettingsLink current={false} orgId={props.org.id} />
      ) : null}
      {open ? (
        <OrgSwitcherSheet
          close={() => setOpen(false)}
          current={props.org.id}
          user={props.user}
        />
      ) : null}
    </header>
  )
}

/** The workspace list as a page: on a phone, and in a narrow window. */
export function HomeList(props: { org: OrgSummary; user: User }) {
  return (
    <>
      <ListHeader org={props.org} settings user={props.user} />
      <div className={styles.scroll}>
        <NewWorkspaceLink current={false} orgId={props.org.id} variant="page" />
        <OrgList orgId={props.org.id} selectedId={null} variant="page" />
      </div>
    </>
  )
}
