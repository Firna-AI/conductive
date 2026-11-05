import { InputFrame } from '@firna/ui/input'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { control } from '../../design/metrics'
import { envVars, startupScript } from '../../fixtures/repositories'
import { noop } from '../../noop'
import { ActionButton, IconButton } from '../common/actions'
import { Section } from './Section'
import styles from './EnvironmentSections.module.css'

/** The script that prepares each sandbox of a repository. */
export function StartupScriptSection() {
  const theme = useSharedUiTheme()
  return (
    <Section
      actions={<ActionButton disabled>Save script</ActionButton>}
      description="Runs when the base updates and each time a sandbox starts."
      title="Startup script"
    >
      <InputFrame
        accessibilityLabel="Startup script"
        inputStyle={{ fontFamily: theme.fonts.mono, fontSize: 12.5 }}
        multiline
        numberOfLines={6}
        onChangeText={noop}
        size={control.field}
        value={startupScript}
      />
    </Section>
  )
}

/**
 * The environment variables of every sandbox of a repository. Values are
 * write-only: the app shows that a value is set, and can replace it.
 */
export function EnvVarsSection() {
  return (
    <Section
      actions={<ActionButton icon={Plus}>Add variable</ActionButton>}
      description="Available in every sandbox of this repository. Changes apply the next time a sandbox starts."
      title="Environment variables"
    >
      <ul aria-label="Environment variables" className={styles.list}>
        {envVars.map((item) => (
          <li className={styles.row} key={item.name}>
            <span className={styles.name}>{item.name}</span>
            <span aria-label="Value set" className={styles.value} role="img">
              ••••••••
            </span>
            <span className={styles.actions}>
              <IconButton
                icon={Pencil}
                label={`Change the value of ${item.name}`}
              />
              <IconButton icon={Trash2} label={`Delete ${item.name}`} />
            </span>
          </li>
        ))}
      </ul>
    </Section>
  )
}
