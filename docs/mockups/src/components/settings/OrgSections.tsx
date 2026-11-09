import { Input } from '@firna/ui/input'
import { LogOut, Trash2 } from 'lucide-react'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { LinkTabs } from '../common/LinkTabs'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { DetailList } from './DetailList'
import { Section } from './Section'
import styles from './OrgSections.module.css'

export type SettingsTab = 'general' | 'repositories' | 'computer' | 'members'

/**
 * Why the settings show without edit fields and actions: the person signed
 * in is a member who is not an admin, or the operator suspended the org. A
 * member's view says that only an admin can change a value. The notice of a
 * suspended org says why, so its sections say nothing more.
 */
export type ReadOnlyCause = 'member' | 'suspended'

/** The page of each tab of the org settings. */
const settingsLinks: Readonly<Record<SettingsTab, string>> = {
  general: paths.orgSettings,
  repositories: paths.repositories,
  computer: paths.cloudComputer,
  members: paths.members,
}

/** The page of each tab of the settings of a suspended org. */
export const suspendedSettingsLinks: Readonly<Record<SettingsTab, string>> = {
  general: paths.suspendedSettings,
  repositories: paths.suspendedRepositories,
  computer: paths.suspendedComputer,
  members: paths.suspendedMembers,
}

/**
 * The parts of the org settings, as tabs that link to each part. Every
 * person of the org sees the same tabs. `wrap` puts the tabs on two lines,
 * for a phone, where they do not fit on one.
 */
export function SettingsTabs(props: {
  tab: SettingsTab
  wrap?: boolean
  links?: Readonly<Record<SettingsTab, string>>
}) {
  const links = props.links ?? settingsLinks
  const tabs = [
    { label: 'General', tab: 'general' },
    { label: 'Repositories', tab: 'repositories' },
    { label: 'Cloud computer', tab: 'computer' },
    { label: 'Members', tab: 'members' },
  ] satisfies readonly { label: string; tab: SettingsTab }[]
  return (
    <LinkTabs
      label="Org settings"
      tabs={tabs.map((item) => ({
        label: item.label,
        to: links[item.tab],
        selected: props.tab === item.tab,
      }))}
      wrap={props.wrap}
    />
  )
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
 * The name of the org and the initials that the rail shows. `readOnly`
 * shows them without fields and Save: for a member who is not an admin,
 * because only admins manage the settings of the org, and for everyone in
 * a suspended org.
 */
export function OrgDetailsSection(props: {
  name: string
  initials: string
  readOnly?: ReadOnlyCause
}) {
  if (props.readOnly) {
    return (
      <Section
        description={
          props.readOnly === 'member'
            ? 'Only an admin can change it.'
            : undefined
        }
        title="Org"
      >
        <DetailList
          rows={[
            { term: 'Name', value: props.name },
            { term: 'Initials', value: props.initials },
          ]}
        />
      </Section>
    )
  }
  return (
    <Section actions={<ActionButton disabled>Save</ActionButton>} title="Org">
      <OrgNameFields initials={props.initials} name={props.name} />
    </Section>
  )
}

/**
 * Deletes the org, as the user decided in decision 30: every cloud computer
 * stops and the org hides at once, and everything is deleted after 7 days
 * unless an admin restores it.
 */
export function DeleteOrgSection(props: { name: string }) {
  return (
    <Section
      actions={
        <ScreenLink asChild to={paths.deleteOrg}>
          <ActionButton icon={Trash2} tone="danger">
            Delete org
          </ActionButton>
        </ScreenLink>
      }
      description={`Stops every cloud computer of ${props.name} and hides it from its members. Everything is deleted after 7 days, unless an admin restores it.`}
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
    <Section
      actions={
        <ScreenLink asChild to={paths.suspendedLeaveConfirm}>
          <ActionButton icon={LogOut} tone="danger">
            Leave org
          </ActionButton>
        </ScreenLink>
      }
      description={`You can no longer open ${props.name}. Your workspaces stay in it.`}
      title="Leave org"
    />
  )
}
