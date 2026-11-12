import { useEffect, useRef, useState } from 'react'
import { Button } from '@firna/ui/button'
import { ArrowUp, Paperclip, Square } from 'lucide-react'
import {
  focusStayed,
  type ComposerFocusRequest,
} from '../../app/composer-focus'
import { filesWait } from '../../app/draft-files'
import type { Agent, AgentChoice, AgentModel } from '../../shared/agents'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/components/chat/Composer.module.css'
import { MentionAnchor } from '../../../docs/mockups/src/components/chat/MentionList'
import {
  SessionLoginLabel,
  type SessionLogin,
} from '../../../docs/mockups/src/components/chat/SessionLogin'
import type { Draft } from '../state/chat-snapshot'
import { ActionButton, IconButton } from '../ui/actions'
import { DraftFiles, OversizeNotice } from './AttachmentChips'
import { ChipTextField } from './chip-field/ChipTextField'
import type { FieldHandle } from './chip-field/focus-plugins'
import local from './chat.module.css'
import { ModelPicker } from './ModelPicker'
import { useSendKey } from './send-key'

/** A request that the message field takes the focus once. */
export interface ComposerFocus {
  readonly request: ComposerFocusRequest
  /** The composer took the request: it focused, or the focus had moved. */
  readonly done: () => void
}

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
  /** A notice says why a message cannot go yet, so Send is off. */
  blocked: boolean
  /**
   * The agent login of another member that the session uses, which a label
   * in the bar names. A message on the reader's own login has no label.
   */
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
  /** Try again on a file whose upload failed. */
  onRetryFile: (id: string) => void
  onRemoveFile: (id: string) => void
  onChooseModel: (choice: AgentChoice) => void
  /** The field takes the focus when it shows, as `ComposerFocus` says. */
  focus?: ComposerFocus | null
}

/**
 * Gives the focus to the field once for each request, when the composer
 * shows it, unless the focus moved to another element since the request.
 */
function useRequestedFocus(focus: ComposerFocus | null) {
  const field = useRef<FieldHandle>(null)
  const request = focus?.request ?? null
  const done = focus?.done
  useEffect(() => {
    if (request === null) return
    if (focusStayed(request)) field.current?.focus()
    done?.()
  }, [request, done])
  return field
}

/**
 * The message box: attached files above the text, then a bar with the
 * attach button, the model picker, and Send. Send waits while a file
 * uploads or failed. Files over the size limit get a notice over the box,
 * which can open the file picker again. While a turn runs, a message
 * steers the turn, and Stop sits beside Send. While the sandbox is not
 * ready, Send still sends, and the workspace queues the message. When a
 * message spends the agent login of another member, a label after the
 * model picker names that login, so the box keeps its place. Enter follows
 * the shared rule of `useSendKey`: on desktop, Enter sends and Shift+Enter
 * starts a new line. The text field asks the send key before it adds a
 * line, so Enter never adds a line to a message that it sends. A pasted
 * workspace link shows as a chip, and the draft keeps the plain link. In a
 * chat with the files of its workspace, `@` opens the list of the files and
 * folders just above the box, and a pick shows as a file chip. A focus
 * request, such as from a click on the workspace in the sidebar, puts the
 * caret in the field when it shows.
 */
export function Composer(props: ComposerProps) {
  const control = useControlSizes()
  const files = useRef<HTMLInputElement>(null)
  const [mentionHost, setMentionHost] = useState<HTMLDivElement | null>(null)
  const { draft } = props
  const empty = draft.text.trim() === '' && draft.files.length === 0
  const off = empty || props.blocked || props.sending || filesWait(draft.files)
  const steers = props.running && props.startsSession !== true
  const sendKey = useSendKey(!off, props.onSend)
  const field = useRequestedFocus(props.focus ?? null)
  return (
    <>
      <OversizeNotice
        onAttach={() => files.current?.click()}
        refused={draft.refused}
      />
      <div className={styles.wrap}>
        <MentionAnchor onElement={setMentionHost}>
          <div className={styles.composer}>
            {draft.files.length > 0 ? (
              <DraftFiles
                files={draft.files}
                onRemove={props.onRemoveFile}
                onRetry={props.onRetryFile}
              />
            ) : null}
            <ChipTextField
              handle={field}
              label="Message"
              lines={2}
              maxLines={8}
              mentionHost={mentionHost}
              onChangeText={props.onChangeText}
              onEnter={sendKey}
              owner={draft.id}
              placeholder={
                steers ? 'Steer the agent while it works' : 'Message the agent'
              }
              value={draft.text}
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
              {props.login ? <SessionLoginLabel {...props.login} /> : null}
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
        </MentionAnchor>
      </div>
    </>
  )
}
