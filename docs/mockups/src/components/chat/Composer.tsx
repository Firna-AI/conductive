import { Button } from '@firna/ui/button'
import { InputFrame } from '@firna/ui/input'
import { ArrowUp, Paperclip, Square } from 'lucide-react'
import type { AgentChoice } from '../../fixtures/agents'
import type { Attachment } from '../../fixtures/attachments'
import { noop } from '../../noop'
import { ScreenLink } from '../common/ScreenLink'
import { ActionButton, IconButton } from '../common/actions'
import { useControlSizes } from '../common/touch'
import { AttachmentChips } from './AttachmentChips'
import { ModelPicker } from './ModelPicker'
import styles from './Composer.module.css'

export type ComposerState = {
  /** The model and the effort of the next message. */
  choice: AgentChoice
  /** An agent turn runs, so a message steers it. */
  running: boolean
  draft: string
  attachments: readonly Attachment[]
  /** The model picker is open. */
  picker?: boolean
  /** The text of an empty box. */
  placeholder?: string
  /** The screen that Send leads to, when the mockups draw it. */
  sendTo?: string
  /** The agent of the chosen model is not connected, so Send is off. */
  blocked?: boolean
}

function SendButton(props: { draft: string; blocked?: boolean }) {
  const control = useControlSizes()
  const off = props.draft === '' || props.blocked === true
  return (
    <Button
      accessibilityLabel="Send"
      boxSize={control.height}
      disabled={off}
      icon={ArrowUp}
      onPress={noop}
      shape="square"
      size="sm"
      tone={off ? 'secondary' : 'primary'}
    />
  )
}

/**
 * The message box: attached files above the text, then a bar with the
 * attach button, the model picker, and Send. While a turn runs, a message
 * steers the turn, and Stop ends it.
 */
export function Composer(props: ComposerState & { lines?: number }) {
  const { field } = useControlSizes()
  const placeholder = props.running
    ? 'Steer the agent while it works'
    : (props.placeholder ?? 'Message the agent')
  return (
    <div className={styles.wrap}>
      <div className={styles.composer}>
        {props.attachments.length > 0 ? (
          <AttachmentChips attachments={props.attachments} />
        ) : null}
        <InputFrame
          accessibilityLabel="Message"
          focusIndicator="none"
          maxLines={8}
          multiline
          numberOfLines={props.lines ?? 2}
          onChangeText={noop}
          placeholder={placeholder}
          size={field}
          value={props.draft}
          variant="seamless"
        />
        <div className={styles.bar}>
          <IconButton icon={Paperclip} label="Attach files" />
          <ModelPicker choice={props.choice} open={props.picker} />
          <span className={styles.spacer} />
          {props.running ? (
            <ActionButton icon={Square}>Stop</ActionButton>
          ) : null}
          {props.sendTo ? (
            <ScreenLink asChild to={props.sendTo}>
              <SendButton draft={props.draft} />
            </ScreenLink>
          ) : (
            <SendButton blocked={props.blocked} draft={props.draft} />
          )}
        </div>
      </div>
      {props.running && props.draft !== '' ? (
        <span className={styles.hint}>
          The agent reads this at its next step.
        </span>
      ) : null}
    </div>
  )
}
