import type { ReactNode } from 'react'
import { Section } from '../../ui/components/settings/Section'
import type { ComputerModel, ScriptKind } from '../../app/computer-model'
import { CodeField } from '../../files/code/CodeField'
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
 * A script of the org, which an admin edits in a code field with line
 * numbers and shell colours (decision 57). Save script waits for a change.
 * The field keeps the text that the user types while a save runs.
 */
export function ScriptSection(props: ScriptProps) {
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
      <CodeField
        label={props.title}
        name="script.sh"
        onChange={script.change}
        value={script.draft}
      />
      {props.notice}
    </Section>
  )
}
