import { membersTab } from '../entries/components/members/MembersTab.mockup'
import { computerData } from '../components/settings/ComputerTab'
import { computerTab } from '../entries/components/settings/ComputerTab.mockup'
import {
  deleteOrgSection,
  leaveOrgSection,
  orgDetailsSection,
} from '../entries/components/settings/OrgSections.mockup'
import type { ReadOnlyCause } from '../components/settings/OrgSections'
import {
  orgRepositoryList,
  repositoryList,
} from '../entries/components/settings/RepositoryList.mockup'
import { section } from '../entries/components/settings/Section.mockup'
import {
  memberViewer,
  you,
  type Membership,
  type PersonKey,
} from '../fixtures/members'
import type { OrgSettingsState } from './orgSettingsState'
import { settingsOrg } from './settingsOrgs'
import { settingsRepositoryNotice } from './settingsRepositoryNotice'
import { defined, plainData } from '../defined'

/** The person signed in: Cal, an admin, or Priya, a member who is not. */
export function settingsViewer(state: OrgSettingsState): PersonKey {
  return state.viewer === 'admin' ? you : memberViewer
}

/**
 * Whether the last-admin rule lets a person leave the org: a member who is
 * not an admin always can, and an admin only while another active admin
 * remains. Cal is the only admin of Acme, so only its other members can.
 */
function mayLeave(person: PersonKey, members: readonly Membership[]): boolean {
  const role = members.find((item) => item.person === person)?.role
  if (role !== 'admin') return true
  return members.some((item) => item.role === 'admin' && item.person !== person)
}

/** Why the person signed in cannot change the settings, when they cannot. */
function readOnlyCause(state: OrgSettingsState): ReadOnlyCause | undefined {
  if (state.org === 'suspended') return 'suspended'
  return state.viewer === 'admin' ? undefined : 'member'
}

/**
 * The sentence after the description of the repositories. The notice of a
 * suspended org says why nothing changes, so the tab adds nothing.
 */
const repositoryNotes: Readonly<Record<ReadOnlyCause | 'editable', string>> = {
  editable: ' Adding a repository starts a build.',
  member: ' Only an admin can change them.',
  suspended: '',
}

/** The body of the open tab of the org settings. */
export function TabBody(props: { state: OrgSettingsState }) {
  const { state } = props
  const viewer = settingsViewer(state)
  const readOnly = readOnlyCause(state)
  const settings = settingsOrg(state)
  const { org } = settings
  switch (state.tab) {
    case 'general':
      return (
        <>
          <orgDetailsSection.Component
            initials={org.initials}
            moklyInstance="org-details"
            name={org.name}
            {...defined({ readOnly })}
          />
          {readOnly ? null : (
            <deleteOrgSection.Component
              moklyInstance="delete-org"
              name={org.name}
            />
          )}
          {readOnly === 'suspended' && mayLeave(viewer, settings.members) ? (
            <leaveOrgSection.Component
              moklyInstance="leave-org"
              name={org.name}
            />
          ) : null}
        </>
      )
    case 'repositories': {
      const note = repositoryNotes[readOnly ?? 'editable']
      return (
        <section.Component
          description={`The cloud computer of ${org.name} holds these repositories, and its workspaces start in them.${note}`}
          moklyInstance="repositories"
          title="Repositories"
        >
          {settingsRepositoryNotice(state, settings)}
          {readOnly ? (
            <orgRepositoryList.Component
              moklyInstance="repository-list"
              repositories={settings.repositories}
            />
          ) : (
            <repositoryList.Component
              moklyInstance="repository-list"
              repositories={settings.repositories}
              search=""
            />
          )}
        </section.Component>
      )
    }
    case 'computer':
      return (
        <computerTab.Component
          build={state.build}
          computer={plainData(computerData(settings.computer))}
          envForm={state.envForm}
          moklyInstance="computer"
          org={org.name}
          script={state.script}
          {...defined({
            readOnly,
            repositoryNotice:
              settingsRepositoryNotice(state, settings) ?? undefined,
          })}
        />
      )
    case 'members':
      return (
        <membersTab.Component
          canManage={readOnly === undefined}
          invites={settings.invites}
          members={settings.members}
          moklyInstance="members"
          viewer={viewer}
          workspaces={settings.workspaces}
        />
      )
  }
}
