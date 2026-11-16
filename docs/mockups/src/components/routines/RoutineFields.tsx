import { useId, type ReactNode } from 'react'
import type { Viewport } from '@mokly/mokly'
import { Input } from '@firna/ui/input'
import { Switch } from '@firna/ui/switch'
import { ChevronDown } from 'lucide-react'
import { repositoryOf, type Routine } from '../../fixtures/routines'
import { sections } from '../../fixtures/sections'
import { noop } from '../../noop'
import { actionButton } from '../../entries/components/common/actions.mockup'
import type { IconKey } from '../../entries/components/common/icons'
import { useControlSizes } from '../common/touch'
import { personAvatar } from '../../entries/components/orgs/OrgTile.mockup'
import { DetailList } from '../settings/DetailList'
import form from './form.module.css'
import styles from './RoutineFields.module.css'

/**
 * A closed menu button that picks a value, such as the repository. `id`
 * names the picker for Mokly.
 */
function Picker(props: {
  id: 'repository' | 'section'
  icon: IconKey
  name: string
  value: string
}) {
  return (
    <span className={styles.picker}>
      <actionButton.Component
        accessibilityLabel={`${props.name}: ${props.value}`}
        icon={props.icon}
        menu
        moklyInstance={`${props.id}-picker`}
        trailing={
          <ChevronDown aria-hidden className={styles.chevron} size={13} />
        }
      >
        {props.value}
      </actionButton.Component>
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
function Creator(props: { routine: Routine }) {
  const { owner } = props.routine
  return (
    <span className={styles.by}>
      By
      <personAvatar.Component
        initials={owner.initials}
        moklyInstance="creator"
        size={18}
      />
      <span className={styles.person}>{owner.name}</span>
    </span>
  )
}

/**
 * The name, the Active switch, the repository, and the section of the run
 * workspaces, which the owner changes, and "By" with the owner. An empty
 * name saves as "Untitled routine".
 */
export function RoutineFields(props: { routine: Routine; viewport: Viewport }) {
  const { routine } = props
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
            placeholder="Untitled routine"
            size={field}
            value={routine.name}
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
            value={routine.active}
          />
        </div>
      </div>
      <div className={mobile ? styles.stack : styles.meta}>
        <Field label="Repository">
          <Picker
            icon="folder-git-2"
            id="repository"
            name="Repository"
            value={repositoryOf(routine)}
          />
        </Field>
        <Field label="Section">
          <Picker
            icon="rows-3"
            id="section"
            name="Section of the run workspaces"
            value={sections[routine.section].name}
          />
        </Field>
        <Creator routine={routine} />
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
 * routine (decision 502).
 */
export function RoutineFacts(props: { routine: Routine; schedules: boolean }) {
  const { routine } = props
  return (
    <DetailList
      rows={[
        { term: 'State', value: routine.active ? 'Active' : 'Off' },
        { term: 'Repository', value: repositoryOf(routine) },
        { term: 'Section', value: sections[routine.section].name },
        { term: 'By', value: routine.owner.name },
        ...(props.schedules
          ? [{ term: 'Time zone', value: routine.timeZone }]
          : []),
      ]}
    />
  )
}
