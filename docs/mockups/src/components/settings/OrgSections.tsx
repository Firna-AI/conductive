import { Input } from '@firna/ui/input'
import { Trash2 } from 'lucide-react'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { LinkTabs } from '../common/LinkTabs'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { DetailList } from './DetailList'
import { Section } from './Section'
import styles from './OrgSections.module.css'

export type SettingsTab =
  'general' | 'repositories' | 'computer' | 'boat-key' | 'members'

/**
 * The parts of the org settings, as tabs that link to each part. Only an
 * admin sees the Boat key tab. `wrap` puts the tabs on two lines, for a
 * phone, where they do not fit on one.
 */
export function SettingsTabs(props: {
  tab: SettingsTab
  admin: boolean
  wrap?: boolean
}) {
  const tabs = [
    { label: 'General', to: paths.orgSettings, tab: 'general' },
    { label: 'Repositories', to: paths.repositories, tab: 'repositories' },
    { label: 'Cloud computer', to: paths.cloudComputer, tab: 'computer' },
    { label: 'Boat key', to: paths.boatKey, tab: 'boat-key' },
    { label: 'Members', to: paths.members, tab: 'members' },
  ] satisfies readonly { label: string; to: string; tab: SettingsTab }[]
  return (
    <LinkTabs
      label="Org settings"
      tabs={tabs
        .filter((item) => props.admin || item.tab !== 'boat-key')
        .map((item) => ({
          label: item.label,
          to: item.to,
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
 * shows them without fields and Save, for a member who is not an admin,
 * because only admins manage the settings of the org.
 */
export function OrgDetailsSection(props: {
  name: string
  initials: string
  readOnly?: boolean
}) {
  if (props.readOnly) {
    return (
      <Section description="Only an admin can change it." title="Org">
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
