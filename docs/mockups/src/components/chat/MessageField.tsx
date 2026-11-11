import { InputFrame } from '@firna/ui/input'
import { noop } from '../../noop'
import { useControlSizes } from '../common/touch'
import { useChatWorkspaces } from './chatWorkspaces'
import { ChipTextField } from './ChipTextField'
import { DraftText, holdsChips } from './MessageText'

/**
 * The text field of a message box, named "Message". A draft with a link to
 * a workspace of the org, or with a mention of a file or a folder, shows
 * it as a chip at once, in the field that holds chips. Any other draft
 * shows in the plain text field. Both fields show at least `lines` lines,
 * and they grow up to `maxLines`. `pointer` draws the pointer over the
 * icon of the first chip, as a view cannot hover.
 */
export function MessageField(props: {
  text: string
  placeholder: string
  lines: number
  maxLines: number
  pointer?: boolean
}) {
  const { field } = useControlSizes()
  const workspaces = useChatWorkspaces()
  if (holdsChips(props.text, workspaces)) {
    return (
      <ChipTextField
        label="Message"
        lines={props.lines}
        maxLines={props.maxLines}
      >
        <DraftText pointer={props.pointer} text={props.text} />
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
