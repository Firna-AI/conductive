import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import styles from '../../../docs/mockups/src/components/settings/EnvironmentSections.module.css'
import {
  Section,
  SectionText,
} from '../../../docs/mockups/src/components/settings/Section'
import type { ComputerModel } from '../../app/computer-model'
import type { OrgSummary } from '../../shared/orgs'
import { ActionButton, IconButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { AddVariableForm, ChangeValueRow } from './EnvVarForms'

/** A variable: its name, and dots for its value, which the app never shows. */
function EnvVarRow(props: {
  name: string
  computer: ComputerModel
  admin: boolean
  change: () => void
}) {
  const remove = useAction(
    () => props.computer.removeEnvVar(props.name),
    `${props.name} was not deleted`,
  )
  return (
    <li className={styles.row}>
      <span className={styles.name}>{props.name}</span>
      <span aria-label="Value set" className={styles.value} role="img">
        ••••••••
      </span>
      {props.admin ? (
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
      ) : null}
    </li>
  )
}

/**
 * The environment variables of the workspaces of the org (decision 17).
 * Values are write-only: the app shows that a value is set, and an admin
 * replaces it, deletes the variable, or adds one. A member who is not an
 * admin sees the names only (decision 57).
 */
export function EnvVarsSection(props: {
  org: OrgSummary
  computer: ComputerModel
  vars: readonly { name: string }[]
}) {
  const admin = props.org.role === 'admin'
  const [changing, setChanging] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  return (
    <Section
      actions={
        admin && !adding ? (
          <ActionButton icon={Plus} onPress={() => setAdding(true)}>
            Add variable
          </ActionButton>
        ) : undefined
      }
      description={`Workspaces of ${props.org.name} get these each time their cloud computer starts. Builds run without them.`}
      title="Environment variables"
    >
      {props.vars.length === 0 ? (
        <SectionText muted>No variables yet.</SectionText>
      ) : (
        <ul aria-label="Environment variables" className={styles.list}>
          {props.vars.map((item) =>
            admin && changing === item.name ? (
              <ChangeValueRow
                close={() => setChanging(null)}
                computer={props.computer}
                key={item.name}
                name={item.name}
              />
            ) : (
              <EnvVarRow
                admin={admin}
                change={() => setChanging(item.name)}
                computer={props.computer}
                key={item.name}
                name={item.name}
              />
            ),
          )}
        </ul>
      )}
      {adding ? (
        <AddVariableForm
          close={() => setAdding(false)}
          computer={props.computer}
        />
      ) : null}
    </Section>
  )
}
