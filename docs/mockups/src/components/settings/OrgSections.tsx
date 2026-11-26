import type { ReadOnlyCause } from '../../../../../src/ui/components/settings/readOnlyCause'
import { Input } from '@firna/ui/input'
import { noop } from '../../../../../src/ui/noop'
import { paths } from '../../paths'
import type { OrgColor } from '../../../../../src/ui/design/orgColors'
import { actionButton } from '../../entries/components/common/actions.mockup'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { detailList } from '../../entries/components/settings/DetailList.mockup'
import { OrgColorField } from '../../../../../src/ui/components/settings/OrgColorField'
import { section } from '../../entries/components/settings/Section.mockup'
import { defined } from '../../defined'
import styles from '../../../../../src/ui/components/settings/OrgSections.module.css'

export type SettingsTab =
  'general' | 'repositories' | 'computer' | 'agents' | 'secrets' | 'members'

/** The page of each tab of the org settings. */
export const settingsLinks: Readonly<Record<SettingsTab, string>> = {
  general: paths.orgSettings,
  repositories: paths.repositories,
  computer: paths.cloudComputer,
  agents: paths.orgAgents,
  secrets: paths.secrets,
  members: paths.members,
}

/** The page of each tab of the settings of a suspended org. */
export const suspendedSettingsLinks: Readonly<Record<SettingsTab, string>> = {
  general: paths.suspendedSettings,
  repositories: paths.suspendedRepositories,
  computer: paths.suspendedComputer,
  agents: paths.suspendedAgents,
  secrets: paths.suspendedSecrets,
  members: paths.suspendedMembers,
}

/** The name of an org and the initials that the rail shows. */
export function OrgNameFields(props: { name: string; initials: string }) {
  const { field } = useControlSizes()
  return (
    <div className={styles.fields}>
      <Input label="Name" onChangeText={noop} size={field} value={props.name} />
      <Input
        hint="Shown in the rail."
        label="Initials"
        onChangeText={noop}
        size={field}
        value={props.initials}
      />
    </div>
  )
}

/**
 * The name, the initials, and the colour of the org. `readOnly` shows them
 * without fields and Save: for a member who is not an admin, because only
 * admins manage the settings of the org, and for everyone in a suspended
 * org. An admin changes the colour in its own section below.
 */
export function OrgDetailsSection(props: {
  name: string
  initials: string
  color: OrgColor
  readOnly?: ReadOnlyCause
}) {
  if (props.readOnly) {
    return (
      <section.Component
        moklyInstance="org"
        title="Org"
        {...defined({
          description:
            props.readOnly === 'member'
              ? 'Only an admin can change it.'
              : undefined,
        })}
      >
        <detailList.Component
          moklyInstance="org-details"
          rows={[
            { term: 'Name', value: props.name },
            { term: 'Initials', value: props.initials },
            { term: 'Colour', color: props.color },
          ]}
        />
      </section.Component>
    )
  }
  return (
    <section.Component
      actions={
        <actionButton.Component disabled moklyInstance="save-org">
          Save
        </actionButton.Component>
      }
      moklyInstance="org"
      title="Org"
    >
      <OrgNameFields initials={props.initials} name={props.name} />
    </section.Component>
  )
}

/**
 * The colour of the org, which the rail shows on its tile while the org is
 * open. A choice saves at once, so the section has no Save.
 */
export function OrgColorSection(props: { color: OrgColor }) {
  return (
    <section.Component
      description="Shown in the rail while this org is open."
      moklyInstance="colour"
      title="Colour"
    >
      <OrgColorField onChange={noop} value={props.color} />
    </section.Component>
  )
}

/**
 * Deletes the org, as the user decided in decision 30: every cloud computer
 * stops and the org hides at once, and everything is deleted after 7 days
 * unless an admin restores it.
 */
export function DeleteOrgSection(props: { name: string }) {
  return (
    <section.Component
      actions={
        <ScreenLink asChild to={paths.deleteOrg}>
          <actionButton.Component
            icon="trash-2"
            moklyInstance="delete-org"
            tone="danger"
          >
            Delete org
          </actionButton.Component>
        </ScreenLink>
      }
      description={`Stops every cloud computer of ${props.name} and hides it from its members. Everything is deleted after 7 days, unless an admin restores it.`}
      moklyInstance="delete-org-section"
      title="Delete org"
    />
  )
}

/**
 * Leaves the org. A suspended org offers it to each person whom the
 * last-admin rule lets leave, because a leave is the one change that a
 * suspension allows. The workspaces of the person stay in the org.
 */
export function LeaveOrgSection(props: { name: string }) {
  return (
    <section.Component
      actions={
        <ScreenLink asChild to={paths.suspendedLeaveConfirm}>
          <actionButton.Component
            icon="log-out"
            moklyInstance="leave-org"
            tone="danger"
          >
            Leave org
          </actionButton.Component>
        </ScreenLink>
      }
      description={`You can no longer open ${props.name}. Your workspaces stay in it.`}
      moklyInstance="leave-org-section"
      title="Leave org"
    />
  )
}
