import { Button } from '@firna/ui/button'
import { InputFrame } from '@firna/ui/input'
import { List, ListItem } from '@firna/ui/list'
import { useSharedUiTheme } from '@firna/ui/theme'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { envVars, startupScript } from '../../fixtures/repositories'
import { noop } from '../../noop'
import { Section } from './Section'
import styles from './EnvironmentSections.module.css'

/** The script that prepares each sandbox of a repository. */
export function StartupScriptSection() {
  const theme = useSharedUiTheme()
  return (
    <Section
      actions={
        <Button disabled onPress={noop} size="sm" tone="secondary">
          Save script
        </Button>
      }
      description="Runs when the base updates and each time a sandbox starts."
      title="Startup script"
    >
      <InputFrame
        accessibilityLabel="Startup script"
        inputStyle={{ fontFamily: theme.fonts.mono, fontSize: 12.5 }}
        multiline
        numberOfLines={6}
        onChangeText={noop}
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
      actions={
        <Button icon={Plus} onPress={noop} size="sm" tone="secondary">
          Add variable
        </Button>
      }
      description="Available in every sandbox of this repository. Changes apply the next time a sandbox starts."
      title="Environment variables"
    >
      <div className={styles.list}>
        <List
          accessibilityLabel="Environment variables"
          itemKey={(item) => item.name}
          items={[...envVars]}
          renderItem={(item) => (
            <ListItem
              description={<span className={styles.value}>••••••••••••</span>}
              size="sm"
              title={<span className={styles.name}>{item.name}</span>}
              trailing={
                <div className={styles.rowActions}>
                  <Button
                    accessibilityLabel={`Change the value of ${item.name}`}
                    icon={Pencil}
                    onPress={noop}
                    shape="square"
                    size="sm"
                    tone="plain"
                  />
                  <Button
                    accessibilityLabel={`Delete ${item.name}`}
                    icon={Trash2}
                    onPress={noop}
                    shape="square"
                    size="sm"
                    tone="plain"
                  />
                </div>
              }
            />
          )}
        />
      </div>
    </Section>
  )
}
