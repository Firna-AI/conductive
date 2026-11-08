import { useState, type ReactNode } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/settings/EnvironmentSections.module.css'
import {
  Section,
  SectionText,
} from '../../../docs/mockups/src/components/settings/Section'
import type { ComputerModel } from '../../app/computer-model'
import { mayChangeSettings } from '../../app/permissions'
import type { OrgSummary } from '../../shared/orgs'
import { useOrgAccess } from '../context'
import { ActionButton, IconButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { AddVariableForm, ChangeValueRow } from './EnvVarForms'

interface EnvVarsProps {
  org: OrgSummary
  computer: ComputerModel
  vars: readonly { name: string }[]
}

function description(org: OrgSummary): string {
  return `Workspaces of ${org.name} get these each time their cloud computer starts. Builds run without them.`
}

/** A variable: its name, and dots for its value, which the app never shows. */
function EnvVarRow(props: { name: string; children?: ReactNode }) {
  return (
    <li className={styles.row}>
      <span className={styles.name}>{props.name}</span>
      <span aria-label="Value set" className={styles.value} role="img">
        ••••••••
      </span>
      {props.children}
    </li>
  )
}

/** The row of a variable with Change and Delete. */
function EditableEnvVarRow(props: {
  name: string
  computer: ComputerModel
  change: () => void
}) {
  const remove = useAction(
    () => props.computer.removeEnvVar(props.name),
    `${props.name} was not deleted`,
  )
  return (
    <EnvVarRow name={props.name}>
      <span className={styles.actions}>
        <IconButton
          disabled={remove.pending}
          icon={Pencil}
          label={`Change the value of ${props.name}`}
          onPress={props.change}
        />
        <IconButton
          busy={remove.pending}
          disabled={remove.pending}
          icon={Trash2}
          label={`Delete ${props.name}`}
          onPress={() => remove.run()}
        />
      </span>
    </EnvVarRow>
  )
}

/** One row for each variable, or words that say that there is none yet. */
function EnvVarList(props: {
  vars: readonly { name: string }[]
  row: (name: string) => ReactNode
}) {
  if (props.vars.length === 0) {
    return <SectionText muted>No variables yet.</SectionText>
  }
  return (
    <ul aria-label="Environment variables" className={styles.list}>
      {props.vars.map((item) => props.row(item.name))}
    </ul>
  )
}

/**
 * The variables for a person who may change them: Add variable, and Change
 * and Delete in each row. The open forms live in this part, so they close
 * when the permission ends, as after a save that the API refuses because
 * the org is suspended.
 */
function EnvVarsEditor(props: EnvVarsProps) {
  const [changing, setChanging] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  return (
    <Section
      actions={
        adding ? undefined : (
          <ActionButton icon={Plus} onPress={() => setAdding(true)}>
            Add variable
          </ActionButton>
        )
      }
      description={description(props.org)}
      title="Environment variables"
    >
      <EnvVarList
        row={(name) =>
          changing === name ? (
            <ChangeValueRow
              close={() => setChanging(null)}
              computer={props.computer}
              key={name}
              name={name}
            />
          ) : (
            <EditableEnvVarRow
              change={() => setChanging(name)}
              computer={props.computer}
              key={name}
              name={name}
            />
          )
        }
        vars={props.vars}
      />
      {adding ? (
        <AddVariableForm
          close={() => setAdding(false)}
          computer={props.computer}
        />
      ) : null}
    </Section>
  )
}

/**
 * The environment variables of the workspaces of the org. Values are
 * write-only: the app shows that a value is set, and an admin replaces it,
 * deletes the variable, or adds one. A member who is not an admin sees the
 * names only, and so does everyone in a suspended org.
 */
export function EnvVarsSection(props: EnvVarsProps) {
  const admin = mayChangeSettings(useOrgAccess(props.org))
  if (admin) return <EnvVarsEditor {...props} />
  return (
    <Section description={description(props.org)} title="Environment variables">
      <EnvVarList
        row={(name) => <EnvVarRow key={name} name={name} />}
        vars={props.vars}
      />
    </Section>
  )
}
