import type { ReactNode } from 'react'
import { actionButton } from '../../entries/components/common/actions.mockup'
import {
  codeBlock,
  codeField,
} from '../../entries/components/files/CodeField.mockup'
import { section } from '../../entries/components/settings/Section.mockup'
import { instanceKey } from '../../instanceKey'
import { defined } from '../../defined'

/**
 * A script of the org, in a code field with line numbers and shell
 * colours, with its save action. `notice` shows under the field, such as
 * the request to build after a save. `readOnly` shows the script as code
 * to read, without the save action, for a member who is not an admin
 * (decision 57).
 */
export function ScriptSection(props: {
  title: string
  description: string
  script: string
  notice?: ReactNode
  readOnly?: boolean
}) {
  return (
    <section.Component
      description={props.description}
      moklyInstance="script"
      title={props.title}
      {...defined({
        actions: props.readOnly ? undefined : (
          <actionButton.Component
            disabled
            moklyInstance={`save-${instanceKey(props.title)}`}
          >
            Save script
          </actionButton.Component>
        ),
      })}
    >
      {props.readOnly ? (
        <codeBlock.Component
          label={props.title}
          moklyInstance="script-text"
          name="script.sh"
          value={props.script}
        />
      ) : (
        <codeField.Component
          label={props.title}
          moklyInstance="script-field"
          name="script.sh"
          value={props.script}
        />
      )}
      {props.notice}
    </section.Component>
  )
}
