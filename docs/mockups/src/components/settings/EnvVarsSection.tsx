import { Input } from '@firna/ui/input'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { productName } from '../../brand'
import { envVars, newEnvVar, type EnvVar } from '../../fixtures/computer'
import { noop } from '../../noop'
import { ActionButton, IconButton } from '../common/actions'
import { classes } from '../common/classes'
import { useControlSizes } from '../common/touch'
import { SecretMark, SecretSwitch, ValueDots } from './EnvVarParts'
import { secretNote } from './envVarCopy'
import { Section, SectionText } from './Section'
import styles from './EnvironmentSections.module.css'
import sections from './Section.module.css'

/**
 * The form of the env vars that is open: none, Add variable, or the new
 * value of the first variable.
 */
export type EnvVarForm = 'none' | 'add' | 'change'

/** The Secret switch of a variable, which saves the mark at once. */
function RowSwitch(props: { item: EnvVar }) {
  return (
    <SecretSwitch
      label={`Secret value of ${props.item.name}`}
      onValueChange={noop}
      value={props.item.secret}
    />
  )
}

/** An admin's row: the name, the Secret switch, Change, and Delete. */
function EditableRow(props: { item: EnvVar }) {
  const { item } = props
  return (
    <li className={classes(styles.row, styles.editable)}>
      <span className={styles.name}>{item.name}</span>
      <RowSwitch item={item} />
      <ValueDots />
      <span className={styles.actions}>
        <IconButton icon={Pencil} label={`Change the value of ${item.name}`} />
        <IconButton icon={Trash2} label={`Delete ${item.name}`} />
      </span>
    </li>
  )
}

/**
 * The row of a variable whose value changes. The field takes the place of
 * the value and the actions, and the mark stays as it is.
 */
function ChangingRow(props: { item: EnvVar }) {
  const { item } = props
  const { field } = useControlSizes()
  return (
    <li className={classes(styles.row, styles.editable, styles.changing)}>
      <span className={styles.name}>{item.name}</span>
      <RowSwitch item={item} />
      <span className={styles.edit}>
        <Input
          accessibilityLabel={`New value of ${item.name}`}
          autoComplete="off"
          onChangeText={noop}
          placeholder="New value"
          secureTextEntry
          size={field}
          value=""
        />
        <ActionButton tone="primary">Save</ActionButton>
        <IconButton icon={X} label="Cancel" />
      </span>
    </li>
  )
}

/** A member's row: the name, the mark, and the value, without actions. */
function ReadOnlyRow(props: { item: EnvVar }) {
  return (
    <li className={styles.row}>
      <span className={styles.name}>{props.item.name}</span>
      <SecretMark secret={props.item.secret} />
      <ValueDots />
    </li>
  )
}

/**
 * A new variable: its name, its value, and its Secret mark, which is on
 * at the start.
 */
function AddVariableForm() {
  const { field } = useControlSizes()
  return (
    <>
      <Input
        autoComplete="off"
        label="Name"
        onChangeText={noop}
        size={field}
        value={newEnvVar.name}
      />
      <Input
        autoComplete="off"
        hint={`${productName} keeps it encrypted, and never shows it again.`}
        label="Value"
        onChangeText={noop}
        secureTextEntry
        size={field}
        value={newEnvVar.value}
      />
      <SecretSwitch label="Secret" onValueChange={noop} value />
      <div className={sections.actions}>
        <ActionButton>Cancel</ActionButton>
        <ActionButton icon={Plus} tone="primary">
          Save variable
        </ActionButton>
      </div>
    </>
  )
}

/**
 * The environment variables of the workspaces of the org. Values are
 * write-only: the app shows that a value is set, and an admin can replace
 * it. Each variable has a Secret mark, which an admin switches. `readOnly`
 * shows the names and the marks without controls. `form` opens Add
 * variable, or the new value of the first variable.
 */
export function EnvVarsSection(props: {
  org: string
  readOnly?: boolean
  form?: EnvVarForm
}) {
  const form = props.readOnly ? 'none' : (props.form ?? 'none')
  const row = (item: EnvVar, index: number) => {
    if (props.readOnly) return <ReadOnlyRow item={item} key={item.name} />
    if (form === 'change' && index === 0) {
      return <ChangingRow item={item} key={item.name} />
    }
    return <EditableRow item={item} key={item.name} />
  }
  return (
    <Section
      actions={
        props.readOnly || form === 'add' ? undefined : (
          <ActionButton icon={Plus}>Add variable</ActionButton>
        )
      }
      description={`Workspaces of ${props.org} get these each time their cloud computer starts. Builds run without them.`}
      title="Environment variables"
    >
      <ul aria-label="Environment variables" className={styles.list}>
        {envVars.map(row)}
      </ul>
      <SectionText muted>{secretNote}</SectionText>
      {form === 'add' ? <AddVariableForm /> : null}
    </Section>
  )
}
