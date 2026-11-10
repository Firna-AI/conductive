import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { LeaveOrgDialog } from '../components/members/LeaveOrgDialog'
import { RemoveMemberDialog } from '../components/members/RemoveMemberDialog'
import { SuspendedOrgNotice } from '../components/orgs/SuspendedOrgNotice'
import { failedBuildOf } from '../components/settings/BuildSection'
import { DeleteOrgDialog } from '../components/settings/DeleteOrgDialog'
import { SettingsTabs } from '../components/settings/OrgSections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { memberViewer, people, viewerMembership } from '../fixtures/members'
import { type Org, orgList } from '../fixtures/orgs'
import { repositoryChanges } from '../fixtures/repositories'
import { settingsViewer, TabBody } from './orgSettingsTabs'
import { settingsOrg } from './settingsOrgs'

export const orgSettingsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'tab',
    'build',
    'script',
    'repositoryChange',
    'envForm',
    'dialog',
    'viewer',
    'org',
  ],
  properties: {
    tab: { enum: ['general', 'repositories', 'computer', 'members'] },
    /**
     * The builds of the cloud computer, which its tab shows. `time-limit` is
     * a build that the app stopped at its 60-minute limit. `none` is an org
     * with no build yet, such as a new org whose first build did not start.
     */
    build: { enum: ['ready', 'building', 'failed', 'time-limit', 'none'] },
    /**
     * The install script: the one that the newest build started with, or
     * one that an admin changed and saved after that start, which a later
     * build runs.
     */
    script: { enum: ['built', 'changed'] },
    /**
     * The saved repository changes of Acme that its cloud computer does not
     * hold yet: none, acme/admin-dashboard added, acme/marketing-site
     * removed, or both. The repository notice then shows on the
     * Repositories and Cloud computer tabs, in the state that `build`
     * gives. Firna draws no change, because the notices of its first build
     * cover the time before its first good build.
     */
    repositoryChange: { enum: repositoryChanges },
    /**
     * The open form of the environment variables, which the cloud computer
     * tab of an admin shows: none, Add variable, or the new value of
     * DATABASE_URL.
     */
    envForm: { enum: ['none', 'add', 'change'] },
    /**
     * A dialog over the page: Delete org, the removal of a member, or the
     * leave of a suspended org.
     */
    dialog: { enum: ['none', 'delete-org', 'remove-member', 'leave-org'] },
    /**
     * The person signed in: an admin, or a member who is not an admin. A
     * member sees no actions on the members, no Delete org, and the name,
     * the repositories, and the cloud computer read-only.
     */
    viewer: { enum: ['admin', 'member'] },
    /**
     * The org: Acme in use, Acme suspended by the operator, or Firna, the
     * new org of the sign-up, whose builds start with its first build. A
     * suspended org shows its notice above every tab, and every person,
     * also an admin, sees the settings read-only, without Delete org. Its
     * one action is Leave org, for each person whom the last-admin rule
     * lets leave.
     */
    org: { enum: ['active', 'suspended', 'new'] },
  },
} as const

export type OrgSettingsState = SchemaProps<typeof orgSettingsSchema>

/** The settings of Acme, on its General tab, with no dialog open. */
export const acmeSettings: OrgSettingsState = {
  tab: 'general',
  build: 'ready',
  script: 'built',
  repositoryChange: 'none',
  envForm: 'none',
  dialog: 'none',
  viewer: 'admin',
  org: 'active',
}

/**
 * The settings of an org: its name and initials, the repositories that it
 * uses, its cloud computer, and its members. The app-wide connections live
 * in the account. Only an admin changes the members and deletes the org. A
 * suspended org shows its notice first, and nobody changes its settings.
 */
export function OrgSettingsScreen(props: {
  state: OrgSettingsState
  viewport: Viewport
  /** The orgs of the person signed in, which the rail lists. */
  railOrgs?: readonly Org[]
}) {
  const { state, viewport } = props
  const admin = state.viewer === 'admin'
  const suspended = state.org === 'suspended'
  const mobile = viewport === 'mobile'
  const settings = settingsOrg(state)
  const { org } = settings
  // A suspended org opens only the leave, because nothing else in it can
  // change. An org in use has no Leave org.
  const dialogs: Readonly<Record<OrgSettingsState['dialog'], ReactNode>> = {
    none: null,
    'delete-org': suspended ? null : <DeleteOrgDialog viewport={viewport} />,
    'remove-member': suspended ? null : (
      <RemoveMemberDialog viewport={viewport} />
    ),
    'leave-org': suspended ? (
      <LeaveOrgDialog viewer={settingsViewer(state)} viewport={viewport} />
    ) : null,
  }
  const dialog = dialogs[state.dialog]
  const page = (
    <Page
      back={mobile ? { label: 'Workspaces', to: settings.list } : undefined}
      subtitle="Org settings"
      tabs={
        <SettingsTabs links={settings.links} tab={state.tab} wrap={mobile} />
      }
      title={org.name}
      viewport={viewport}
    >
      {suspended ? <SuspendedOrgNotice org={org} /> : null}
      <TabBody state={state} />
    </Page>
  )
  if (mobile) {
    return (
      <MobileFrame>
        {page}
        {dialog}
      </MobileFrame>
    )
  }
  const sidebar = (
    <Sidebar
      current="settings"
      newWorkspaceTo={settings.newWorkspace}
      org={org}
      sections={settings.sections}
      settingsAlert={failedBuildOf(state.build) !== undefined}
      suspended={suspended}
      viewer={viewerMembership(state.viewer)}
    />
  )
  return (
    <AppFrame
      overlay={dialog}
      rail={{
        orgs: props.railOrgs ?? orgList,
        current: org.key,
        suspended: suspended ? org.key : undefined,
        person: admin ? undefined : people[memberViewer],
      }}
      sidebar={sidebar}
    >
      {page}
    </AppFrame>
  )
}
