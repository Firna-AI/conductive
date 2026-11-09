import { Button } from '@firna/ui/button'
import { ArrowUp, Paperclip, Square } from 'lucide-react'
import type { AgentChoice, AgentKey } from '../../fixtures/agents'
import type { Attachment } from '../../fixtures/attachments'
import { noop } from '../../noop'
import { ScreenLink } from '../common/ScreenLink'
import { ActionButton, IconButton } from '../common/actions'
import { useControlSizes } from '../common/touch'
import { AttachmentChips } from './AttachmentChips'
import { MessageField } from './MessageField'
import { ModelPicker } from './ModelPicker'
import { SessionLoginLabel, type SessionLogin } from './SessionLogin'
import styles from './Composer.module.css'

export type ComposerState = {
  /** The model and the effort of the next message. */
  choice: AgentChoice
  /** An agent turn runs, so a message steers it, and Stop ends it. */
  running: boolean
  /**
   * A message starts a new linked session, so it does not steer a running
   * turn of this session. Stop still ends that turn.
   */
  startsSession?: boolean
  draft: string
  attachments: readonly Attachment[]
  /** The model picker is open. */
  picker?: boolean
  /**
   * The agent of the session, once it has messages. A model of the other
   * agent opens a new session with the draft (decision 51).
   */
  sessionAgent?: AgentKey
  /** The text of an empty box. */
  placeholder?: string
  /** The screen that Send leads to, when the mockups draw it. */
  sendTo?: string
  /** The agent of the chosen model is not connected, so Send is off. */
  blocked?: boolean
  /**
   * The agent login of another member that the session uses: the login of
   * its starter. A label in the bar names it. A message on the own login of
   * the viewer has no label.
   */
  sessionLogin?: SessionLogin
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
 * steers the turn unless it starts a new linked session. Stop ends the
 * running turn. While the sandbox is not ready, also during and after a
 * failed first start, Send queues the message in the workspace. When a
 * message spends the agent login of another member, a label after the
 * model picker names that login, so the box keeps its place.
 * A pasted workspace link shows as a chip, and the draft keeps the plain link.
 */
export function Composer(props: ComposerState & { lines?: number }) {
  const steers = props.running && props.startsSession !== true
  const placeholder = steers
    ? 'Steer the agent while it works'
    : (props.placeholder ?? 'Message the agent')
  const off = props.blocked === true
  return (
    <div className={styles.wrap}>
      <div className={styles.composer}>
        {props.attachments.length > 0 ? (
          <AttachmentChips attachments={props.attachments} />
        ) : null}
        <MessageField
          lines={props.lines ?? 2}
          maxLines={8}
          placeholder={placeholder}
          text={props.draft}
        />
        <div className={styles.bar}>
          <IconButton icon={Paperclip} label="Attach files" />
          <ModelPicker
            choice={props.choice}
            open={props.picker}
            sessionAgent={props.sessionAgent}
          />
          {props.sessionLogin ? (
            <SessionLoginLabel {...props.sessionLogin} />
          ) : null}
          <span className={styles.spacer} />
          {props.running ? (
            <ActionButton icon={Square}>Stop</ActionButton>
          ) : null}
          {props.sendTo && !off ? (
            <ScreenLink asChild to={props.sendTo}>
              <SendButton draft={props.draft} />
            </ScreenLink>
          ) : (
            <SendButton blocked={off} draft={props.draft} />
          )}
        </div>
      </div>
    </div>
  )
}
