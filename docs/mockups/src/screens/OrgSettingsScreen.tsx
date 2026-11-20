import type { ReactNode } from 'react'
import type { SchemaProps, Viewport } from '@mokly/mokly'
import { AppFrame, MobileFrame } from '../components/layout/AppFrame'
import { Page } from '../components/layout/Page'
import { LeaveOrgDialog } from '../components/members/LeaveOrgDialog'
import { RemoveMemberDialog } from '../components/members/RemoveMemberDialog'
import { SuspendedOrgNotice } from '../components/orgs/SuspendedOrgNotice'
import { failedBuildOf } from '../components/settings/BuildSection'
import { DeleteSecretDialog } from '../components/secrets/DeleteSecretDialog'
import { DeleteOrgDialog } from '../components/settings/DeleteOrgDialog'
import {
  RepositoryMenuSheet,
  repositoryOrderStates,
} from '../components/settings/RepositoryOrderList'
import { SettingsTabs } from '../components/settings/OrgSections'
import { Sidebar } from '../components/workspaces/Sidebar'
import { memberViewer, people, viewerMembership } from '../fixtures/members'
import { ORG_COLORS } from '../design/orgColors'
import { type Org, orgList } from '../fixtures/orgs'
import { repositoryChanges } from '../fixtures/repositories'
import {
  orgAgentsDefaults,
  orgAgentsKeys,
  orgAgentsProperties,
} from './orgAgentsState'
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
    'repositoryView',
    'repositoryOrder',
    'envForm',
    'secrets',
    'dialog',
    'viewer',
    'org',
    'color',
    ...orgAgentsKeys,
  ],
  properties: {
    tab: {
      enum: [
        'general',
        'repositories',
        'computer',
        'agents',
        'secrets',
        'members',
      ],
    },
    /**
     * The builds of the cloud computer, which its tab shows. `time-limit` is
     * a build that the app stopped at its 60-minute limit. `none` is an org
     * with no build yet, such as a new org whose first build did not start.
     * `waiting` is a build of an admin that waits for another update of the
     * cloud computer, which members do not see, and that the tab shows as a
     * build that runs. `ended` is a build that an operator ended for such an
     * update, which the tab shows as a failed build.
     */
    build: {
      enum: [
        'ready',
        'building',
        'waiting',
        'failed',
        'time-limit',
        'ended',
        'none',
      ],
    },
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
     * The Repositories tab of an admin: the chosen repositories with Edit,
     * or, after Edit, every repository that the GitHub App reaches, with
     * search, Add, Remove, and Done. `edit-added` is an open edit that
     * adds acme/admin-dashboard, which Done has not saved yet.
     */
    repositoryView: { enum: ['list', 'edit', 'edit-added'] },
    /**
     * The order of the chosen repositories outside Edit, from
     * repository-order decision 1 F: the plain list, the row menu of
     * acme/billing-service open, a drag of acme/marketing-site to the top,
     * or the list after Make default on acme/billing-service.
     */
    repositoryOrder: { enum: repositoryOrderStates },
    /**
     * The open form of the environment variables, which the cloud computer
     * tab of an admin shows: none, Add variable, or the new value of
     * DATABASE_URL.
     */
    envForm: { enum: ['none', 'add', 'change'] },
    /**
     * The Secrets tab: the list, the value of PROD_DATABASE_URL that an
     * admin just revealed, the Add secret form, that form after it refused
     * a name with spaces, or the field of a new value in the row of a
     * secret. `replace-older` lists Cloudflare (read-only), a secret with
     * an older name, and opens that field in its row.
     */
    secrets: {
      enum: [
        'list',
        'revealed',
        'add',
        'add-refused',
        'replace',
        'replace-older',
      ],
    },
    /**
     * A dialog over the page: Delete org, the removal of a member, the
     * leave of a suspended org, that leave while it runs, or the question
     * before Delete of a secret.
     */
    dialog: {
      enum: [
        'none',
        'delete-org',
        'remove-member',
        'leave-org',
        'leaving-org',
        'delete-secret',
      ],
    },
    /**
     * The person signed in: an admin, or a member who is not an admin. A
     * member sees no actions on the members, no Delete org, and the name,
     * the repositories, the cloud computer, and the agents read-only.
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
    /**
     * The colour of the org, which an admin picks on the General tab. The
     * tile of the open org in the rail shows it. Blue is the colour of an
     * org that has none.
     */
    color: { enum: ORG_COLORS },
    ...orgAgentsProperties,
  },
} as const

export type OrgSettingsState = SchemaProps<typeof orgSettingsSchema>

/** The settings of Acme, on its General tab, with no dialog open. */
export const acmeSettings: OrgSettingsState = {
  tab: 'general',
  build: 'ready',
  script: 'built',
  repositoryChange: 'none',
  repositoryView: 'list',
  repositoryOrder: 'list',
  envForm: 'none',
  secrets: 'list',
  dialog: 'none',
  viewer: 'admin',
  org: 'active',
  color: 'blue',
  ...orgAgentsDefaults,
}

/**
 * The settings of an org: its name and initials, the repositories that it
 * uses, its cloud computer, its org logins, its secrets, and its members.
 * The personal logins and the other app-wide connections live in the
 * account. Only an admin changes the members, the org logins, and deletes
 * the org. Every member adds secrets. A suspended org shows its notice
 * first, and nobody changes its settings.
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
      <LeaveOrgDialog
        busy={false}
        viewer={settingsViewer(state)}
        viewport={viewport}
      />
    ) : null,
    'leaving-org': suspended ? (
      <LeaveOrgDialog busy viewer={settingsViewer(state)} viewport={viewport} />
    ) : null,
    'delete-secret': suspended ? null : (
      <DeleteSecretDialog viewport={viewport} />
    ),
  }
  const repositoryMenu =
    mobile &&
    admin &&
    !suspended &&
    state.tab === 'repositories' &&
    state.repositoryView === 'list' &&
    state.repositoryOrder === 'menu' ? (
      <RepositoryMenuSheet repositories={settings.repositories} />
    ) : null
  const dialog = dialogs[state.dialog] ?? repositoryMenu
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
      <TabBody state={state} viewport={viewport} />
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
        orgs: (props.railOrgs ?? orgList).map((item) =>
          item.key === org.key ? { ...item, color: state.color } : item,
        ),
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
