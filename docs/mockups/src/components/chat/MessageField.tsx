import { InputFrame } from '@firna/ui/input'
import type { Attachment } from '../../fixtures/attachments'
import { noop } from '../../../../../src/ui/noop'
import { useControlSizes } from '../../../../../src/ui/components/common/touch'
import { useChatWorkspaces } from './chatWorkspaces'
import { chipTextField } from '../../entries/components/chat/ChipTextField.mockup'
import { holdsChips } from './DraftText'
import { draftText } from '../../entries/components/chat/DraftText.mockup'
import { defined } from '../../defined'

/**
 * The text field of a message box, named "Message". A draft with an
 * attached file, a link to a workspace of the org, or a mention of a file
 * or a folder shows it as a chip at once, in the field that holds chips.
 * `files` are the files of the draft, whose chips stand at their marks.
 * Any other draft shows in the plain text field. Both fields show at least
 * `lines` lines, and they grow up to `maxLines`. `pointer` draws the
 * pointer over the icon of the first chip, as a view cannot hover, and
 * `namePointer` over the name of the first chip, a skill chip. `caret`
 * draws the caret at that index of the text.
 */
export function MessageField(props: {
  text: string
  placeholder: string
  lines: number
  maxLines: number
  files?: readonly Attachment[]
  pointer?: boolean
  namePointer?: boolean
  caret?: number
}) {
  const { field } = useControlSizes()
  const links = useChatWorkspaces()
  if (holdsChips(props.text, links) || props.caret !== undefined) {
    return (
      <chipTextField.Component
        label="Message"
        lines={props.lines}
        maxLines={props.maxLines}
        moklyInstance="chip-field"
      >
        <draftText.Component
          moklyInstance="draft"
          text={props.text}
          {...defined({
            caret: props.caret,
            files: props.files,
            pointer: props.pointer,
            namePointer: props.namePointer,
          })}
        />
      </chipTextField.Component>
    )
  }
  return (
    <InputFrame
      accessibilityLabel="Message"
      focusIndicator="none"
      maxLines={props.maxLines}
      multiline
      numberOfLines={props.lines}
      onChangeText={noop}
      placeholder={props.placeholder}
      size={field}
      value={props.text}
      variant="seamless"
    />
  )
}
