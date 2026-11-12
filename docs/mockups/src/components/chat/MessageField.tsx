import { InputFrame } from '@firna/ui/input'
import type { Attachment } from '../../fixtures/attachments'
import { noop } from '../../noop'
import { useControlSizes } from '../common/touch'
import { useChatWorkspaces } from './chatWorkspaces'
import { ChipTextField } from './ChipTextField'
import { DraftText, holdsChips } from './DraftText'

/**
 * The text field of a message box, named "Message". A draft with an
 * attached file, a link to a workspace of the org, or a mention of a file
 * or a folder shows it as a chip at once, in the field that holds chips.
 * `files` are the files of the draft, whose chips stand at their marks.
 * Any other draft shows in the plain text field. Both fields show at least
 * `lines` lines, and they grow up to `maxLines`. `pointer` draws the
 * pointer over the icon of the first chip, as a view cannot hover, and
 * `caret` draws the caret at that index of the text.
 */
export function MessageField(props: {
  text: string
  placeholder: string
  lines: number
  maxLines: number
  files?: readonly Attachment[]
  pointer?: boolean
  caret?: number
}) {
  const { field } = useControlSizes()
  const workspaces = useChatWorkspaces()
  if (holdsChips(props.text, workspaces) || props.caret !== undefined) {
    return (
      <ChipTextField
        label="Message"
        lines={props.lines}
        maxLines={props.maxLines}
      >
        <DraftText
          caret={props.caret}
          files={props.files}
          pointer={props.pointer}
          text={props.text}
        />
      </ChipTextField>
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
