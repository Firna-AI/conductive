import type { ReactNode } from 'react'
import { InputFrame } from '@firna/ui/input'
import { useSharedUiTheme } from '@firna/ui/theme'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import { Section } from '../../../docs/mockups/src/components/settings/Section'
import type { ComputerModel, ScriptKind } from '../../app/computer-model'
import { ActionButton } from '../ui/actions'
import { useAction } from '../ui/useAction'
import { useSavedDraft } from '../ui/useSavedDraft'

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

/**
 * A script of the org, which an admin edits in a code field (decision 57).
 * Save script waits for a change. The field keeps the text that the user
 * types while a save runs.
 */
export function ScriptSection(props: ScriptProps) {
  const theme = useSharedUiTheme()
  const { field } = useControlSizes()
  const script = useSavedDraft(props.script)
  const save = useAction(
    () => script.save((draft) => props.computer.saveScript(props.kind, draft)),
    'The script was not saved',
  )
  return (
    <Section
      actions={
        <ActionButton
          busy={save.pending}
          disabled={script.draft === props.script}
          keepFocus
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
        numberOfLines={Math.max(3, script.draft.split('\n').length)}
        onChangeText={script.change}
        size={field}
        spellCheck={false}
        value={script.draft}
      />
      {props.notice}
    </Section>
  )
}
