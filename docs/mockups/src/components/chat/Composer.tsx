import { Button } from '@firna/ui/button'
import { InputFrame } from '@firna/ui/input'
import { ArrowUp, Paperclip, Square } from 'lucide-react'
import type { AgentChoice, AgentKey } from '../../fixtures/agents'
import type { Attachment } from '../../fixtures/attachments'
import { noop } from '../../noop'
import { ScreenLink } from '../common/ScreenLink'
import { ActionButton, IconButton } from '../common/actions'
import { useControlSizes } from '../common/touch'
import { AttachmentChips } from './AttachmentChips'
import { ModelPicker } from './ModelPicker'
import { SendWait } from './SendWait'
import { SessionLoginLine, type SessionLogin } from './SessionLogin'
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
  /**
   * The attached files. Send waits while a file uploads, and while a failed
   * upload waits for Try again or Remove, so a message goes with all of its
   * files.
   */
  attachments: readonly Attachment[]
  /** The screen that the attach button leads to, when the mockups draw it. */
  attachTo?: string
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
   * The sandbox of a new workspace starts for the first time, so Send waits.
   * The box keeps the message, and a short reason beside Send says that the
   * user can send it when the sandbox is ready.
   */
  waits?: boolean
  /**
   * Whose agent login the session uses: the login of its starter. The line
   * under the box names it.
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
 * steers the turn, and Stop ends it, unless the message starts a new
 * linked session. While Send waits for the first start of a new
 * workspace, a message in the box shows the reason beside Send.
 * Send also waits for the uploads of the files, whose chips show their
 * state. A line under the box names whose agent login the session uses.
 */
export function Composer(props: ComposerState & { lines?: number }) {
  const { field } = useControlSizes()
  const steers = props.running && props.startsSession !== true
  const placeholder = steers
    ? 'Steer the agent while it works'
    : (props.placeholder ?? 'Message the agent')
  const uploads = props.attachments.some((file) => file.state !== undefined)
  const off = props.blocked === true || props.waits === true || uploads
  const written = props.draft !== '' || props.attachments.length > 0
  const attach = <IconButton icon={Paperclip} label="Attach files" />
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
          {props.attachTo ? (
            <ScreenLink asChild to={props.attachTo}>
              {attach}
            </ScreenLink>
          ) : (
            attach
          )}
          <ModelPicker
            choice={props.choice}
            open={props.picker}
            sessionAgent={props.sessionAgent}
          />
          <span className={styles.spacer} />
          {props.running ? (
            <ActionButton icon={Square}>Stop</ActionButton>
          ) : null}
          {props.waits && written ? <SendWait /> : null}
          {props.sendTo && !off ? (
            <ScreenLink asChild to={props.sendTo}>
              <SendButton draft={props.draft} />
            </ScreenLink>
          ) : (
            <SendButton blocked={off} draft={props.draft} />
          )}
        </div>
      </div>
      {props.sessionLogin ? <SessionLoginLine {...props.sessionLogin} /> : null}
      {steers && props.draft !== '' ? (
        <span className={styles.hint}>
          The agent reads this at its next step.
        </span>
      ) : null}
    </div>
  )
}
