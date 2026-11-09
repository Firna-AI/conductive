import type { ReactNode } from 'react'
import { InputFrame } from '@firna/ui/input'
import { useSharedUiTheme } from '@firna/ui/theme'
import { noop } from '../../noop'
import { ActionButton } from '../common/actions'
import { useControlSizes } from '../common/touch'
import { MonoBlock, Section } from './Section'

/**
 * The script in a code field, which an admin edits. The field shows at
 * least three lines, also for the empty script of a new org.
 */
function ScriptField(props: { title: string; script: string }) {
  const theme = useSharedUiTheme()
  const { field } = useControlSizes()
  return (
    <InputFrame
      accessibilityLabel={props.title}
      inputStyle={{ fontFamily: theme.fonts.mono, fontSize: 12.5 }}
      multiline
      numberOfLines={Math.max(3, props.script.split('\n').length)}
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
