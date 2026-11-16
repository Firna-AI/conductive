import { useId, type ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { Input } from '@firna/ui/input'
import { Switch } from '@firna/ui/switch'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown, FolderGit2, Rows3 } from 'lucide-react'
import { repositoryOf, type Automation } from '../../fixtures/automations'
import { sections } from '../../fixtures/sections'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { useControlSizes } from '../common/touch'
import { PersonAvatar } from '../orgs/OrgTile'
import { DetailList } from '../settings/DetailList'
import form from './form.module.css'
import styles from './AutomationFields.module.css'

/** A closed menu button that picks a value, such as the repository. */
function Picker(props: { icon: LucideIcon; name: string; value: string }) {
  return (
    <span className={styles.picker}>
      <ActionButton
        accessibilityLabel={`${props.name}: ${props.value}`}
        icon={props.icon}
        menu
        trailing={
          <ChevronDown aria-hidden className={styles.chevron} size={13} />
        }
      >
        {props.value}
      </ActionButton>
    </span>
  )
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className={form.field}>
      <span className={form.label}>{props.label}</span>
      {props.children}
    </div>
  )
}

/** The person whose logins the runs use, as "By Cal". */
function Creator(props: { automation: Automation }) {
  const { owner } = props.automation
  return (
    <span className={styles.by}>
      By
      <PersonAvatar initials={owner.initials} size={18} />
      <span className={styles.person}>{owner.name}</span>
    </span>
  )
}

/**
 * The name, the Active switch, the repository, and the section of the run
 * workspaces, which the owner changes, and "By" with the owner. An empty
 * name saves as "Untitled automation".
 */
export function AutomationFields(props: {
  automation: Automation
  viewport: Viewport
}) {
  const { automation } = props
  const { field } = useControlSizes()
  const activeId = useId()
  const mobile = props.viewport === 'mobile'
  return (
    <div className={styles.fields}>
      <div className={mobile ? styles.stack : styles.top}>
        <div className={styles.name}>
          <Input
            label="Name"
            onChangeText={noop}
            placeholder="Untitled automation"
            size={field}
            value={automation.name}
          />
        </div>
        <div className={mobile ? styles.switchRow : styles.switchField}>
          <span className={form.label} id={activeId}>
            Active
          </span>
          <Switch
            aria-labelledby={activeId}
            onValueChange={noop}
            size={field}
            value={automation.active}
          />
        </div>
      </div>
      <div className={mobile ? styles.stack : styles.meta}>
        <Field label="Repository">
          <Picker
            icon={FolderGit2}
            name="Repository"
            value={repositoryOf(automation)}
          />
        </Field>
        <Field label="Section">
          <Picker
            icon={Rows3}
            name="Section of the run workspaces"
            value={sections[automation.section].name}
          />
        </Field>
        <Creator automation={automation} />
      </div>
      <p className={form.hint}>
        Each run opens a new workspace on a new branch of this repository, in
        this section.
      </p>
    </div>
  )
}

/**
 * The same facts as another member reads them. Only the owner changes a
 * automation (decision 502).
 */
export function AutomationFacts(props: {
  automation: Automation
  schedules: boolean
}) {
  const { automation } = props
  return (
    <DetailList
      rows={[
        { term: 'State', value: automation.active ? 'Active' : 'Off' },
        { term: 'Repository', value: repositoryOf(automation) },
        { term: 'Section', value: sections[automation.section].name },
        { term: 'By', value: automation.owner.name },
        ...(props.schedules
          ? [{ term: 'Time zone', value: automation.timeZone }]
          : []),
      ]}
    />
  )
}
