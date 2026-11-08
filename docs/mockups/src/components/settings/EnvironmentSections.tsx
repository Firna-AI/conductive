import type { ReactNode } from 'react'
import { InputFrame } from '@firna/ui/input'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { envVars } from '../../fixtures/computer'
import { noop } from '../../noop'
import { ActionButton, IconButton } from '../common/actions'
import { useControlSizes } from '../common/touch'
import { MonoBlock, Section } from './Section'
import styles from './EnvironmentSections.module.css'

/** The script in a code field, which an admin edits. */
function ScriptField(props: { title: string; script: string }) {
  const theme = useSharedUiTheme()
  const { field } = useControlSizes()
  return (
    <InputFrame
      accessibilityLabel={props.title}
      inputStyle={{ fontFamily: theme.fonts.mono, fontSize: 12.5 }}
      multiline
      numberOfLines={props.script.split('\n').length}
      onChangeText={noop}
      size={field}
      value={props.script}
    />
  )
}

/**
 * A script of the org, in a code field, with its save action. `notice`
 * shows under the field, such as the request to build after a save.
 * `readOnly` shows the script as text, without the save action, for a
 * member who is not an admin (decision 57).
 */
export function ScriptSection(props: {
  title: string
  description: string
  script: string
  notice?: ReactNode
  readOnly?: boolean
}) {
  return (
    <Section
      actions={
        props.readOnly ? undefined : (
          <ActionButton disabled>Save script</ActionButton>
        )
      }
      description={props.description}
      title={props.title}
    >
      {props.readOnly ? (
        <MonoBlock text={props.script} />
      ) : (
        <ScriptField script={props.script} title={props.title} />
      )}
      {props.notice}
    </Section>
  )
}

/**
 * The environment variables of the workspaces of the org. Values are
 * write-only: the app shows that a value is set, and an admin can replace
 * it. `readOnly` shows the names without actions.
 */
export function EnvVarsSection(props: { org: string; readOnly?: boolean }) {
  return (
    <Section
      actions={
        props.readOnly ? undefined : (
          <ActionButton icon={Plus}>Add variable</ActionButton>
        )
      }
      description={`Workspaces of ${props.org} get these each time their cloud computer starts. Builds run without them.`}
      title="Environment variables"
    >
      <ul aria-label="Environment variables" className={styles.list}>
        {envVars.map((item) => (
          <li className={styles.row} key={item.name}>
            <span className={styles.name}>{item.name}</span>
            <span aria-label="Value set" className={styles.value} role="img">
              ••••••••
            </span>
            {props.readOnly ? null : (
              <span className={styles.actions}>
                <IconButton
                  icon={Pencil}
                  label={`Change the value of ${item.name}`}
                />
                <IconButton icon={Trash2} label={`Delete ${item.name}`} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}
