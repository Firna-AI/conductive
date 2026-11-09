import { useState, type ReactNode } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { secretNote } from '../../../docs/mockups/src/components/settings/envVarCopy'
import {
  SecretMark,
  ValueDots,
} from '../../../docs/mockups/src/components/settings/EnvVarParts'
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
import { MarkSwitch, useMark, type EnvVar } from './EnvVarMark'

interface EnvVarsProps {
  org: OrgSummary
  computer: ComputerModel
  vars: readonly EnvVar[]
}

function description(org: OrgSummary): string {
  return `Workspaces of ${org.name} get these each time their cloud computer starts. Builds run without them.`
}

/**
 * A variable for a person who may not change it: its name, its Secret
 * mark, and dots for its value, which the app never shows.
 */
function ReadOnlyEnvVarRow(props: { item: EnvVar }) {
  return (
    <li className={styles.row}>
      <span className={styles.name}>{props.item.name}</span>
      <SecretMark secret={props.item.secret} />
      <ValueDots />
    </li>
  )
}

/**
 * The row of a variable with its Secret switch, Change, and Delete. While
 * a write of the row runs, the other controls of the row wait.
 */
function EditableEnvVarRow(props: {
  item: EnvVar
  computer: ComputerModel
  change: () => void
}) {
  const { item, computer } = props
  const mark = useMark(computer, item)
  const remove = useAction(
    () => computer.removeEnvVar(item.name),
    `${item.name} was not deleted`,
  )
  const busy = mark.pending || remove.pending
  return (
    <li className={classes(styles.row, styles.editable)}>
      <span className={styles.name}>{item.name}</span>
      <MarkSwitch disabled={busy} item={item} mark={mark} />
      <ValueDots />
      <span className={styles.actions}>
        <IconButton
          disabled={busy}
          icon={Pencil}
          label={`Change the value of ${item.name}`}
          onPress={props.change}
        />
        <IconButton
          busy={remove.pending}
          disabled={busy}
          icon={Trash2}
          label={`Delete ${item.name}`}
          onPress={() => remove.run()}
        />
      </span>
    </li>
  )
}

/** One row for each variable, or words that say that there is none yet. */
function EnvVarList(props: {
  vars: readonly EnvVar[]
  row: (item: EnvVar) => ReactNode
}) {
  if (props.vars.length === 0) {
    return <SectionText muted>No variables yet.</SectionText>
  }
  return (
    <ul aria-label="Environment variables" className={styles.list}>
      {props.vars.map((item) => props.row(item))}
    </ul>
  )
}

/** What the Secret mark does, and when a change applies. */
function SecretNote() {
  return <SectionText muted>{secretNote}</SectionText>
}

/**
 * The variables for a person who may change them: Add variable, and the
 * Secret switch, Change, and Delete in each row. The open forms live in
 * this part, so they close when the permission ends, as after a save that
 * the API refuses because the org is suspended.
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
        row={(item) =>
          changing === item.name ? (
            <ChangeValueRow
              close={() => setChanging(null)}
              computer={props.computer}
              item={item}
              key={item.name}
            />
          ) : (
            <EditableEnvVarRow
              change={() => setChanging(item.name)}
              computer={props.computer}
              item={item}
              key={item.name}
            />
          )
        }
        vars={props.vars}
      />
      {props.vars.length > 0 || adding ? <SecretNote /> : null}
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
 * deletes the variable, or adds one. Each variable has a Secret mark,
 * which an admin switches in its row. A member who is not an admin sees
 * the names and the marks only, and so does everyone in a suspended org.
 */
export function EnvVarsSection(props: EnvVarsProps) {
  const admin = mayChangeSettings(useOrgAccess(props.org))
  if (admin) return <EnvVarsEditor {...props} />
  return (
    <Section description={description(props.org)} title="Environment variables">
      <EnvVarList
        row={(item) => <ReadOnlyEnvVarRow item={item} key={item.name} />}
        vars={props.vars}
      />
      {props.vars.length > 0 ? <SecretNote /> : null}
    </Section>
  )
}
