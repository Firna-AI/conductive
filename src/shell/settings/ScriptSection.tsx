import { useState, type ReactNode } from 'react'
import { InputFrame } from '@firna/ui/input'
import { useSharedUiTheme } from '@firna/ui/theme'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import {
  MonoBlock,
  Section,
} from '../../../docs/mockups/src/components/settings/Section'
import type { ComputerModel, ScriptKind } from '../../app/computer-model'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'

interface ScriptProps {
  title: string
  description: string
  kind: ScriptKind
  /** The saved script. */
  script: string
  computer: ComputerModel
  /** Shows under the script, such as the request to build after a save. */
  notice?: ReactNode
}

/** The script in a code field, with Save script, which waits for a change. */
function ScriptEditor(props: ScriptProps) {
  const theme = useSharedUiTheme()
  const { field } = useControlSizes()
  const [draft, setDraft] = useState(props.script)
  const save = useAction(
    () => props.computer.saveScript(props.kind, draft),
    'The script was not saved',
  )
  return (
    <Section
      actions={
        <ActionButton
          busy={save.pending}
          disabled={draft === props.script}
          onPress={() => save.run()}
        >
          Save script
        </ActionButton>
      }
      description={props.description}
      title={props.title}
    >
      <InputFrame
        accessibilityLabel={props.title}
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect={false}
        inputStyle={{ fontFamily: theme.fonts.mono, fontSize: 12.5 }}
        multiline
        numberOfLines={Math.max(3, draft.split('\n').length)}
        onChangeText={setDraft}
        size={field}
        spellCheck={false}
        value={draft}
      />
      {props.notice}
    </Section>
  )
}

/**
 * A script of the org. An admin edits it in a code field and saves it. A
 * member who is not an admin sees it as text (decision 57).
 */
export function ScriptSection(props: ScriptProps & { admin: boolean }) {
  const { admin, ...script } = props
  if (admin) {
    // A newly saved script starts a new draft.
    return <ScriptEditor key={script.script} {...script} />
  }
  return (
    <Section description={script.description} title={script.title}>
      <MonoBlock text={script.script} />
      {script.notice}
    </Section>
  )
}
