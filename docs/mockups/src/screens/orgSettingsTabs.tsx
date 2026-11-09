import { MembersTab } from '../components/members/MembersTab'
import { ComputerTab } from '../components/settings/ComputerTab'
import {
  DeleteOrgSection,
  LeaveOrgSection,
  OrgDetailsSection,
  type ReadOnlyCause,
} from '../components/settings/OrgSections'
import {
  OrgRepositoryList,
  RepositoryList,
} from '../components/settings/RepositoryList'
import { Section } from '../components/settings/Section'
import {
  memberViewer,
  you,
  type Membership,
  type PersonKey,
} from '../fixtures/members'
import type { OrgSettingsState } from './OrgSettingsScreen'
import { settingsOrg } from './settingsOrgs'

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
  editable: ' A change takes effect at the next build.',
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
          <OrgDetailsSection
            initials={org.initials}
            name={org.name}
            readOnly={readOnly}
          />
          {readOnly ? null : <DeleteOrgSection name={org.name} />}
          {readOnly === 'suspended' && mayLeave(viewer, settings.members) ? (
            <LeaveOrgSection name={org.name} />
          ) : null}
        </>
      )
    case 'repositories': {
      const note = repositoryNotes[readOnly ?? 'editable']
      return (
        <Section
          description={`The cloud computer of ${org.name} holds these repositories, and its workspaces start in them.${note}`}
          title="Repositories"
        >
          {readOnly ? (
            <OrgRepositoryList repositories={settings.repositories} />
          ) : (
            <RepositoryList repositories={settings.repositories} search="" />
          )}
        </Section>
      )
    }
    case 'computer':
      return (
        <ComputerTab
          build={state.build}
          computer={settings.computer}
          org={org.name}
          readOnly={readOnly}
          script={state.script}
        />
      )
    case 'members':
      return (
        <MembersTab
          canManage={readOnly === undefined}
          invites={settings.invites}
          members={settings.members}
          viewer={viewer}
          workspaces={settings.workspaces}
        />
      )
  }
}
