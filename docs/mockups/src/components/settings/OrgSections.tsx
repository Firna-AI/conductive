import { Input } from '@firna/ui/input'
import { Trash2 } from 'lucide-react'
import { noop } from '../../noop'
import { paths } from '../../paths'
import { ActionButton } from '../common/actions'
import { LinkTabs } from '../common/LinkTabs'
import { ScreenLink } from '../common/ScreenLink'
import { useControlSizes } from '../common/touch'
import { Section } from './Section'
import styles from './OrgSections.module.css'

export type SettingsTab =
  'general' | 'repositories' | 'computer' | 'members' | 'billing'

/**
 * The parts of the org settings, as tabs that link to each part. `wrap`
 * puts the tabs on two lines, for a phone, where they do not fit on one.
 */
export function SettingsTabs(props: { tab: SettingsTab; wrap?: boolean }) {
  return (
    <LinkTabs
      label="Org settings"
      tabs={[
        {
          label: 'General',
          to: paths.orgSettings,
          selected: props.tab === 'general',
        },
        {
          label: 'Repositories',
          to: paths.repositories,
          selected: props.tab === 'repositories',
        },
        {
          label: 'Cloud computer',
          to: paths.cloudComputer,
          selected: props.tab === 'computer',
        },
        {
          label: 'Members',
          to: paths.members,
          selected: props.tab === 'members',
        },
        {
          label: 'Billing',
          to: paths.billing,
          selected: props.tab === 'billing',
        },
      ]}
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

export function OrgDetailsSection(props: { name: string; initials: string }) {
  return (
    <Section actions={<ActionButton disabled>Save</ActionButton>} title="Org">
      <OrgNameFields initials={props.initials} name={props.name} />
    </Section>
  )
}

/**
 * Deletes the org, as the user decided in decision 30: every cloud computer
 * stops and the org hides at once, and everything is deleted after 7 days
 * unless an owner restores it.
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
      description={`Stops every cloud computer of ${props.name} and hides it from its members. Everything is deleted after 7 days, unless an owner restores it.`}
      title="Delete org"
    />
  )
}
