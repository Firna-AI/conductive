import { Input } from '@firna/ui/input'
import { productName } from '../../../../../src/shared/brand'
import { envVars, newEnvVar, type EnvVar } from '../../fixtures/computer'
import { noop } from '../../../../../src/ui/noop'
import {
  actionButton,
  iconButton,
} from '../../entries/components/common/actions.mockup'
import { classes } from '../../../../../src/ui/components/common/classes'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import {
  secretMark,
  secretSwitch,
  valueDots,
} from '../../entries/components/settings/EnvVarParts.mockup'
import { secretNote } from '../../../../../src/ui/components/settings/envVarCopy'
import {
  section,
  sectionText,
} from '../../entries/components/settings/Section.mockup'
import { instanceKey } from '../../instanceKey'
import { defined } from '../../defined'
import styles from '../../../../../src/ui/components/settings/EnvironmentSections.module.css'
import sections from '../../../../../src/ui/components/settings/Section.module.css'

/**
 * The form of the env vars that is open: none, Add variable, or the new
 * value of the first variable.
 */
export type EnvVarForm = 'none' | 'add' | 'change'

/** The Secret switch of a variable, which saves the mark at once. */
function RowSwitch(props: { item: EnvVar }) {
  return (
    <secretSwitch.Component
      label={`Secret value of ${props.item.name}`}
      moklyInstance={`secret-${instanceKey(props.item.name)}`}
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
      <valueDots.Component moklyInstance={`value-${instanceKey(item.name)}`} />
      <span className={styles.actions}>
        <iconButton.Component
          icon="pencil"
          label={`Change the value of ${item.name}`}
          moklyInstance={`change-${instanceKey(item.name)}`}
        />
        <iconButton.Component
          icon="trash-2"
          label={`Delete ${item.name}`}
          moklyInstance={`delete-${instanceKey(item.name)}`}
        />
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
        <actionButton.Component
          moklyInstance={`save-${instanceKey(item.name)}`}
          tone="primary"
        >
          Save
        </actionButton.Component>
        <iconButton.Component
          icon="x"
          label="Cancel"
          moklyInstance={`cancel-${instanceKey(item.name)}`}
        />
      </span>
    </li>
  )
}

/** A member's row: the name, the mark, and the value, without actions. */
function ReadOnlyRow(props: { item: EnvVar }) {
  const key = instanceKey(props.item.name)
  return (
    <li className={styles.row}>
      <span className={styles.name}>{props.item.name}</span>
      <secretMark.Component
        moklyInstance={`mark-${key}`}
        secret={props.item.secret}
      />
      <valueDots.Component moklyInstance={`value-${key}`} />
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
      <secretSwitch.Component label="Secret" moklyInstance="new-secret" value />
      <div className={sections.actions}>
        <actionButton.Component moklyInstance="cancel-variable">
          Cancel
        </actionButton.Component>
        <actionButton.Component
          icon="plus"
          moklyInstance="save-variable"
          tone="primary"
        >
          Save variable
        </actionButton.Component>
      </div>
    </>
  )
}

/**
 * The environment variables of the workspaces of the org. Values are
 * write-only: the app shows that a value is set, and an admin can replace
 * it. Each variable has a Secret mark, which an admin switches. `readOnly`
 * shows the names and the marks without controls. `form` opens Add
 * variable, or the new value of the first variable. `vars` are the
 * variables of the org. A new org has none yet.
 */
export function EnvVarsSection(props: {
  org: string
  readOnly?: boolean
  form?: EnvVarForm
  vars?: readonly EnvVar[]
}) {
  const vars = props.vars ?? envVars
  const form = props.readOnly ? 'none' : (props.form ?? 'none')
  const row = (item: EnvVar, index: number) => {
    if (props.readOnly) return <ReadOnlyRow item={item} key={item.name} />
    if (form === 'change' && index === 0) {
      return <ChangingRow item={item} key={item.name} />
    }
    return <EditableRow item={item} key={item.name} />
  }
  return (
    <section.Component
      description={`Workspaces of ${props.org} get these each time their cloud computer starts. Builds run without them.`}
      moklyInstance="env-vars"
      title="Environment variables"
      {...defined({
        actions:
          props.readOnly || form === 'add' ? undefined : (
            <actionButton.Component icon="plus" moklyInstance="add-variable">
              Add variable
            </actionButton.Component>
          ),
      })}
    >
      {vars.length === 0 ? (
        <sectionText.Component moklyInstance="no-variables" muted>
          No variables yet.
        </sectionText.Component>
      ) : (
        <>
          <ul aria-label="Environment variables" className={styles.list}>
            {vars.map(row)}
          </ul>
          <sectionText.Component moklyInstance="secret-note" muted>
            {secretNote}
          </sectionText.Component>
        </>
      )}
      {form === 'add' ? <AddVariableForm /> : null}
    </section.Component>
  )
}
