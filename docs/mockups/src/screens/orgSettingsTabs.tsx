import type { Viewport } from '@mokly/mokly'
import { membersTab } from '../entries/components/members/MembersTab.mockup'
import { SecretsTab } from '../components/secrets/SecretsTab'
import type { SecretsAccess } from '../components/secrets/secretRights'
import { computerData } from '../components/settings/ComputerTab'
import { computerTab } from '../entries/components/settings/ComputerTab.mockup'
import { OrgAgentsTab } from '../components/settings/OrgAgents'
import {
  deleteOrgSection,
  leaveOrgSection,
  orgDetailsSection,
} from '../entries/components/settings/OrgSections.mockup'
import { OrgColorSection } from '../components/settings/OrgSections'
import { type ReadOnlyCause } from '../../../../src/ui/components/settings/readOnlyCause'
import { RepositoryEditToggle } from '../components/settings/RepositoryList'
import { repositoryList } from '../entries/components/settings/RepositoryList.mockup'
import { RepositoryOrderList } from '../components/settings/RepositoryOrderList'
import { EditRepositoryNotice } from '../../../../src/ui/components/settings/RepositoryNotice'
import { section } from '../entries/components/settings/Section.mockup'
import {
  memberViewer,
  you,
  type Membership,
  type PersonKey,
} from '../fixtures/members'
import { addedRepository } from '../fixtures/repositories'
import { olderSecret, type OrgSecret } from '../fixtures/secrets'
import { orgAgentsFor } from './orgAgentsState'
import type { OrgSettingsState } from './orgSettingsState'
import { settingsOrg } from './settingsOrgs'
import { settingsRepositoryNotice } from './settingsRepositoryNotice'
import { skillsDraft, skillsTrust } from './settingsSkills'
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
 * Who reads the Secrets tab. A member who is not an admin still adds
 * secrets, so only a suspended org shows the tab read-only.
 */
function secretsAccess(state: OrgSettingsState): SecretsAccess {
  const person = settingsViewer(state)
  if (state.org === 'suspended') return { kind: 'suspended', person }
  return { kind: state.viewer, person }
}

/**
 * The secrets of the Secrets tab. The Replace state for an older name also
 * lists Cloudflare (read-only), a secret of Acme, first, as the list sorts
 * by name.
 */
function tabSecrets(
  state: OrgSettingsState,
  secrets: readonly OrgSecret[],
): readonly OrgSecret[] {
  if (state.secrets !== 'replace-older' || state.org === 'new') return secrets
  return [olderSecret, ...secrets]
}

/**
 * The description of the Repositories tab. Only a member who is not an
 * admin gets one. The notice of a suspended org says why nothing changes,
 * so the tab adds nothing.
 */
const repositoryNotes: Readonly<
  Record<ReadOnlyCause | 'editable', string | undefined>
> = {
  editable: undefined,
  member: 'Only an admin can change them.',
  suspended: undefined,
}

/** The body of the open tab of the org settings. */
export function TabBody(props: {
  state: OrgSettingsState
  viewport: Viewport
}) {
  const { state, viewport } = props
  const viewer = settingsViewer(state)
  const readOnly = readOnlyCause(state)
  const settings = settingsOrg(state)
  const { org } = settings
  switch (state.tab) {
    case 'general':
      return (
        <>
          <orgDetailsSection.Component
            color={state.color}
            initials={org.initials}
            moklyInstance="org-details"
            name={org.name}
            {...defined({ readOnly })}
          />
          {readOnly ? null : <OrgColorSection color={state.color} />}
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
      const editing = !readOnly && state.repositoryView !== 'list'
      // An open edit with an add that Done has not saved yet.
      const unsaved = editing && state.repositoryView === 'edit-added'
      const listed = unsaved
        ? settings.repositories.map((repository) =>
            repository.name === addedRepository
              ? { ...repository, used: true }
              : repository,
          )
        : settings.repositories
      return (
        <section.Component
          moklyInstance="repositories"
          title="Repositories"
          {...defined({
            action: readOnly ? undefined : (
              <RepositoryEditToggle editing={editing} />
            ),
            description: note,
          })}
        >
          {unsaved ? (
            <EditRepositoryNotice added={[addedRepository]} />
          ) : (
            settingsRepositoryNotice(state, settings)
          )}
          {editing ? (
            <repositoryList.Component
              moklyInstance="repository-list"
              repositories={listed}
              search=""
            />
          ) : (
            <RepositoryOrderList
              canMove={!readOnly}
              repositories={settings.repositories}
              state={state.repositoryOrder}
              viewport={viewport}
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
            skillsDraft: skillsDraft(state),
            skillsTrust: skillsTrust(state, readOnly !== undefined),
          })}
        />
      )
    case 'agents':
      return <OrgAgentsTab {...orgAgentsFor(state, org.name, readOnly)} />
    case 'secrets':
      return (
        <SecretsTab
          access={secretsAccess(state)}
          computerTo={settings.links.computer}
          org={org.name}
          secrets={tabSecrets(state, settings.secrets)}
          view={state.secrets}
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
