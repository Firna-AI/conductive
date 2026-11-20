import type { ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { leaveOrgDialog } from '../entries/components/members/LeaveOrgDialog.mockup'
import { removeMemberDialog } from '../entries/components/members/RemoveMemberDialog.mockup'
import { suspendedOrgNotice } from '../entries/components/orgs/SuspendedOrgNotice.mockup'
import { failedBuildOf } from '../components/settings/BuildSection'
import { DeleteSecretDialog } from '../components/secrets/DeleteSecretDialog'
import { deleteOrgDialog } from '../entries/components/settings/DeleteOrgDialog.mockup'
import { repositoryOrderOverlay } from '../components/settings/RepositoryOrderList'
import {
  placeLabel,
  settingsGroups,
} from '../components/settings/settingsGroups'
import { sidebar as sidebarPart } from '../entries/components/workspaces/Sidebar.mockup'
import { memberViewer, people, viewerMembership } from '../fixtures/members'
import { type Org, orgList } from '../fixtures/orgs'
import { settingsViewer } from './orgSettingsTabs'
import { tabBody } from '../entries/components/screens/orgSettingsTabs.mockup'
import type { OrgSettingsState } from './orgSettingsState'
import { SettingsFrame } from './settingsFrame'
import { settingsOrg } from './settingsOrgs'
import { plainData } from '../defined'

/**
 * The settings of an org, as the org group of Settings: its name and
 * initials, the repositories that it uses, its cloud computer, its org
 * logins, its secrets, and its members. The Account group holds the
 * personal logins and the other app-wide connections. Only an admin changes the members, the org logins, and deletes
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
  const settings = settingsOrg(state)
  const { org } = settings
  // A suspended org opens only the leave, because nothing else in it can
  // change. An org in use has no Leave org.
  const dialogs: Readonly<Record<OrgSettingsState['dialog'], ReactNode>> = {
    none: null,
    'delete-org': suspended ? null : (
      <deleteOrgDialog.Component
        moklyInstance="delete-org-dialog"
        viewport={viewport}
      />
    ),
    'remove-member': suspended ? null : (
      <removeMemberDialog.Component
        moklyInstance="remove-member-dialog"
        viewport={viewport}
      />
    ),
    'leave-org': suspended ? (
      <leaveOrgDialog.Component
        busy={false}
        moklyInstance="leave-org-dialog"
        viewer={settingsViewer(state)}
        viewport={viewport}
      />
    ) : null,
    'leaving-org': suspended ? (
      <leaveOrgDialog.Component
        busy
        moklyInstance="leave-org-dialog"
        viewer={settingsViewer(state)}
        viewport={viewport}
      />
    ) : null,
    'delete-secret': suspended ? null : (
      <DeleteSecretDialog viewport={viewport} />
    ),
  }
  const repositoryOverlay =
    admin &&
    !suspended &&
    state.tab === 'repositories' &&
    state.repositoryView === 'list'
      ? repositoryOrderOverlay(
          state.repositoryOrder,
          settings.repositories,
          viewport,
        )
      : null
  const dialog = dialogs[state.dialog] ?? repositoryOverlay
  const place = { group: 'org', tab: state.tab } as const
  return (
    <SettingsFrame
      dialog={dialog ?? undefined}
      group={org.name}
      groups={settingsGroups({
        place,
        host: 'chrome-mac',
        org: { name: org.name, links: settings.links },
      })}
      rail={{
        orgs: (props.railOrgs ?? orgList).map((item) =>
          item.key === org.key ? { ...item, color: state.color } : item,
        ),
        current: org.key,
        ...(suspended ? { suspended: org.key } : {}),
        ...(admin ? {} : { person: people[memberViewer] }),
      }}
      sidebar={
        <sidebarPart.Component
          moklyInstance="sidebar"
          newWorkspaceTo={settings.newWorkspace}
          org={org}
          sections={plainData(settings.sections)}
          settingsAlert={failedBuildOf(state.build) !== undefined}
          suspended={suspended}
          viewer={viewerMembership(state.viewer)}
        />
      }
      title={placeLabel(place)}
      viewport={viewport}
    >
      {suspended ? (
        <suspendedOrgNotice.Component
          moklyInstance="suspended-org-notice"
          org={{ name: org.name }}
        />
      ) : null}
      <tabBody.Component
        moklyInstance="tab-body"
        state={state}
        viewport={viewport}
      />
    </SettingsFrame>
  )
}
