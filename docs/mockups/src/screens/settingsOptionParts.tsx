import type { Viewport } from '@mokly/mokly'
import { ChevronLeft, X } from 'lucide-react'
import { IconButton } from '../components/common/actions'
import { ScreenLink } from '../components/common/ScreenLink'
import { SettingsNav } from '../components/settings/SettingsNav'
import { workspaceSections } from '../components/workspaces/sections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { viewerMembership } from '../fixtures/members'
import { orgs } from '../fixtures/orgs'
import { paths } from '../paths'
import { TabContent as AccountTabContent } from './AccountScreen'
import { accountGeneral } from './accountState'
import { acmeSettings } from './OrgSettingsScreen'
import { TabBody } from './orgSettingsTabs'
import {
  groupName,
  settingsGroups,
  settingsSections,
  type SettingsOptionsState,
  type SettingsSection,
} from './settingsOptions'
import styles from './SettingsOptions.module.css'

/** The content of a section: a tab of the account or of the org settings. */
export function SectionContent(props: {
  section: SettingsSection
  viewport: Viewport
}) {
  const info = settingsSections[props.section]
  if (info.account) {
    return (
      <AccountTabContent
        changes={{}}
        host="chrome-mac"
        state={{ ...accountGeneral, tab: info.account }}
        viewport={props.viewport}
      />
    )
  }
  return <TabBody state={{ ...acmeSettings, tab: info.org ?? 'general' }} />
}

/** The sidebar of the workspaces of Acme, as the org pages show it. */
export function WorkspaceSidebar(props: { settings?: boolean }) {
  return (
    <Sidebar
      current={props.settings ? 'settings' : undefined}
      org={orgs.acme}
      sections={workspaceSections()}
      viewer={viewerMembership('admin')}
    />
  )
}

/**
 * Option C: the list of the sections in the place of the sidebar. Its top
 * bar says Settings, and its first row leads back to the workspaces.
 */
export function SettingsSidebar(props: { state: SettingsOptionsState }) {
  return (
    <>
      <div className={styles.sidebarTop}>
        <h2 className={styles.sidebarTitle}>Settings</h2>
      </div>
      <div className={styles.sidebarScroll}>
        <SettingsNav
          groups={settingsGroups(props.state)}
          header={
            <ScreenLink className={styles.backRow} to={paths.shell}>
              <ChevronLeft aria-hidden size={15} />
              Workspaces
            </ScreenLink>
          }
          variant="panel"
        />
      </div>
    </>
  )
}

/**
 * Options A and B: the list of the sections as a column inside the page,
 * beside the section.
 */
export function SplitBody(props: {
  state: SettingsOptionsState
  viewport: Viewport
}) {
  return (
    <div className={styles.split}>
      <div className={styles.splitNav}>
        <SettingsNav groups={settingsGroups(props.state)} variant="panel" />
      </div>
      <div className={styles.splitBody}>
        <div className={styles.column}>
          <SectionContent
            section={props.state.section}
            viewport={props.viewport}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Option D: the settings in a large dialog over the whole window, with the
 * list on its left. Close and Esc return to the page below.
 */
export function SettingsDialog(props: {
  state: SettingsOptionsState
  viewport: Viewport
}) {
  const info = settingsSections[props.state.section]
  return (
    <div className={styles.backdrop}>
      <section aria-label="Settings" className={styles.dialog}>
        <div className={styles.dialogNav}>
          <h2 className={styles.dialogTitle}>Settings</h2>
          <SettingsNav groups={settingsGroups(props.state)} variant="panel" />
        </div>
        <div className={styles.dialogMain}>
          <header className={styles.dialogHeader}>
            <span className={styles.dialogSection}>
              {groupName(info.group)} · {info.label}
            </span>
            <IconButton icon={X} label="Close" />
          </header>
          <div className={styles.splitBody}>
            <div className={styles.column}>
              <SectionContent
                section={props.state.section}
                viewport={props.viewport}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
