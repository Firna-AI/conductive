import { useRef, useState, type RefObject } from 'react'
import { Button } from '@firna/ui/button'
import { ArrowUp, Paperclip, Square } from 'lucide-react'
import { filesWait } from '../../app/draft-files'
import type { Agent, AgentChoice, AgentModel } from '../../shared/agents'
import { classes } from '../../../docs/mockups/src/components/common/classes'
import { useControlSizes } from '../../../docs/mockups/src/components/common/touch'
import styles from '../../../docs/mockups/src/components/chat/Composer.module.css'
import { MentionAnchor } from '../../../docs/mockups/src/components/chat/MentionList'
import {
  SessionLoginLabel,
  type SessionLogin,
} from '../../../docs/mockups/src/components/chat/SessionLogin'
import { useShortcutOffer } from '../../shell/shortcuts/shortcut-context'
import type { Draft } from '../state/chat-snapshot'
import { ActionButton, IconButton } from '../ui/actions'
import { FolderNotice, noticedFolder, OversizeNotice } from './AttachmentChips'
import type { FieldFiles } from './chip-field/attached-files'
import { ChipTextField } from './chip-field/ChipTextField'
import type { FieldHandle } from './chip-field/focus-plugins'
import local from './chat.module.css'
import { useComposerDrop } from './composer-drop'
import { ModelPicker } from './ModelPicker'
import { useSendKey } from './send-key'

export interface ComposerProps {
  draft: Draft
  /**
   * The attached files of the draft, which the chips in its text show, as
   * `FieldFiles` says. The source follows the identity of the draft, so keep
   * one for each `Draft.id`.
   */
  files: FieldFiles
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
  /**
   * Attaches the files of a pick or a drop to the draft. It gives their IDs
   * at once, while they upload, so their chips go into the text in the same
   * event. `folders` names each folder of a drop, which it does not attach.
   */
  onAttach: (
    files: readonly File[],
    folders?: readonly string[],
  ) => readonly string[]
  onChooseModel: (choice: AgentChoice) => void
}

/**
 * The keys of the composer while it shows: Focus the message field, Attach
 * files as the paperclip does, and Stop the agent as Stop does while a turn
 * runs. The model picker offers its own keys.
 */
function useComposerKeys(props: {
  field: RefObject<FieldHandle | null>
  files: RefObject<HTMLInputElement | null>
  stop: (() => void) | null
}) {
  const { field, files } = props
  useShortcutOffer('focus-message', () => field.current?.focus())
  useShortcutOffer('attach-files', () => files.current?.click())
  useShortcutOffer('stop-agent', props.stop)
}

/**
 * The message box: the text, with a chip for each attached file at its
 * place, then a bar with the attach button, the model picker, and Send. The
 * files of a pick go into the text at the caret, or at the end when the text
 * has no caret, and a chip that leaves the text takes its file off the
 * draft. The whole box takes a drop of files, as `useComposerDrop` says,
 * also while a message sends or a file uploads. Send waits while a file
 * uploads or failed. Files over the size limit and a dropped folder get a
 * notice over the box, which can open the file picker again.
 * While a turn runs, a message steers the turn, and Stop sits beside Send.
 * While the sandbox is not ready, Send still sends, and the workspace queues
 * the message. When a message spends the agent login of another member, a
 * label after the model picker names that login, so the box keeps its place.
 * Enter follows the shared rule of `useSendKey`: on desktop, Enter sends and
 * Shift+Enter starts a new line. The text field asks the send key before it
 * adds a line, so Enter never adds a line to a message that it sends. A
 * pasted workspace link shows as a chip, and the draft keeps the plain link.
 * In a chat with the files of its workspace, `@` opens the list of the files
 * and folders just above the box, and a pick shows as a file chip.
 */
export function Composer(props: ComposerProps) {
  const control = useControlSizes()
  const picker = useRef<HTMLInputElement>(null)
  const field = useRef<FieldHandle>(null)
  const [mentionHost, setMentionHost] = useState<HTMLDivElement | null>(null)
  const { draft } = props
  useComposerKeys({
    field,
    files: picker,
    stop: props.running && !props.stopping ? props.onStop : null,
  })
  const empty = draft.text.trim() === '' && draft.files.length === 0
  const off = empty || props.blocked || props.sending || filesWait(draft.files)
  const steers = props.running && props.startsSession !== true
  const sendKey = useSendKey(!off, props.onSend)
  // The field takes changes while the composer shows, so the box takes a
  // drop also while Send is off.
  const drop = useComposerDrop({
    field,
    editable: true,
    attach: props.onAttach,
  })
  const pick = () => picker.current?.click()
  return (
    <>
      <OversizeNotice onAttach={pick} refused={draft.refused} />
      <FolderNotice folder={noticedFolder(draft)} onAttach={pick} />
      <div className={styles.wrap}>
        <MentionAnchor onElement={setMentionHost}>
          <div
            className={classes(
              styles.composer,
              drop.dropping && styles.dropping,
            )}
            {...drop.handlers}
          >
            <ChipTextField
              files={props.files}
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
                onPress={pick}
                shortcut="attach-files"
              />
              <input
                aria-hidden
                className={local.fileInput}
                multiple
                onChange={(event) => {
                  const chosen = [...(event.currentTarget.files ?? [])]
                  event.currentTarget.value = ''
                  field.current?.insertFiles(props.onAttach(chosen))
                }}
                ref={picker}
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
                  shortcut="stop-agent"
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
