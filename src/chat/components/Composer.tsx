import { useRef } from 'react'
import { Button } from '@firna/ui/button'
import { InputFrame } from '@firna/ui/input'
import { ArrowUp, Paperclip, Square } from 'lucide-react'
import type { Agent, AgentChoice, AgentModel } from '../../shared/agents'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/components/chat/Composer.module.css'
import { SendWait } from '../../../docs/mockups/src/components/chat/SendWait'
import {
  SessionLoginLine,
  type SessionLogin,
} from '../../../docs/mockups/src/components/chat/SessionLogin'
import type { Draft } from '../state/chat-snapshot'
import { ActionButton, IconButton } from '../ui/actions'
import { DraftFiles } from './AttachmentChips'
import local from './chat.module.css'
import { ModelPicker } from './ModelPicker'
import { useSendKey } from './send-key'

export interface ComposerProps {
  draft: Draft
  /** The model and the effort of the session. */
  choice: AgentChoice
  models: readonly AgentModel[]
  /** The agent of a session with messages (decision 51). */
  sessionAgent?: Agent
  /** A turn runs, so a message steers it, and Stop ends it. */
  running: boolean
  stopping: boolean
  sending: boolean
  /** A file uploads, so Send waits until it is attached. */
  attaching: boolean
  /** A notice says why a message cannot go yet, so Send is off. */
  blocked: boolean
  /**
   * The first start of the workspace has not succeeded, so Send is off. A
   * message in the box shows the short reason beside Send.
   */
  waits: boolean
  /** Whose agent login the session uses, which a line under the box names. */
  login?: SessionLogin
  /**
   * A message starts a new linked session, so it does not steer a running
   * turn of this session. Stop still ends that turn.
   */
  startsSession?: boolean
  onChangeText: (text: string) => void
  onSend: () => void
  onStop: () => void
  onAttach: (files: readonly File[]) => void
  onRemoveAttachment: (id: string) => void
  onChooseModel: (choice: AgentChoice) => void
}

/**
 * The message box: attached files above the text, then a bar with the
 * attach button, the model picker, and Send. While a turn runs, a message
 * steers the turn, and Stop sits beside Send. While Send waits for the
 * first start of the workspace, the box keeps the message, and the reason
 * shows beside Send. A line under the box names whose agent login the
 * session uses. Enter sends as the shared rule of `useSendKey` says: on
 * desktop, Enter sends and Shift+Enter starts a new line.
 */
export function Composer(props: ComposerProps) {
  const control = useControlSizes()
  const files = useRef<HTMLInputElement>(null)
  const { draft } = props
  const empty = draft.text.trim() === '' && draft.attachments.length === 0
  const off =
    empty || props.blocked || props.waits || props.sending || props.attaching
  const steers = props.running && props.startsSession !== true
  const onKeyDown = useSendKey(!off, props.onSend)
  return (
    <div className={styles.wrap}>
      <div className={styles.composer} onKeyDownCapture={onKeyDown}>
        {draft.attachments.length > 0 ? (
          <DraftFiles
            attachments={draft.attachments}
            onRemove={props.onRemoveAttachment}
          />
        ) : null}
        <InputFrame
          accessibilityLabel="Message"
          focusIndicator="none"
          maxLines={8}
          multiline
          numberOfLines={2}
          onChangeText={props.onChangeText}
          placeholder={
            steers ? 'Steer the agent while it works' : 'Message the agent'
          }
          size={control.field}
          value={draft.text}
          variant="seamless"
        />
        <div className={styles.bar}>
          <IconButton
            icon={Paperclip}
            label="Attach files"
            onPress={() => files.current?.click()}
          />
          <input
            aria-hidden
            className={local.fileInput}
            multiple
            onChange={(event) => {
              props.onAttach([...(event.currentTarget.files ?? [])])
              event.currentTarget.value = ''
            }}
            ref={files}
            tabIndex={-1}
            type="file"
          />
          <ModelPicker
            choice={props.choice}
            models={props.models}
            onChoose={props.onChooseModel}
            sessionAgent={props.sessionAgent}
          />
          <span className={styles.spacer} />
          {props.running ? (
            <ActionButton
              busy={props.stopping}
              icon={Square}
              onPress={props.onStop}
            >
              Stop
            </ActionButton>
          ) : null}
          {props.waits && !empty ? <SendWait /> : null}
          <Button
            accessibilityLabel="Send"
            boxSize={control.height}
            busy={props.sending}
            disabled={off}
            icon={ArrowUp}
            onPress={props.onSend}
            shape="square"
            size="sm"
            tone={off ? 'secondary' : 'primary'}
          />
        </div>
      </div>
      {props.login ? <SessionLoginLine {...props.login} /> : null}
      {steers && draft.text !== '' ? (
        <span className={styles.hint}>
          The agent reads this at its next step.
        </span>
      ) : null}
    </div>
  )
}
