import type { AgentModel } from '../../shared/generated/AgentModel'
import { useRef, useState, type RefObject } from 'react'
import { Paperclip } from 'lucide-react'
import type { Agent } from '../../shared/generated/Agent'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import { filesWait, type IntakeRefusals } from '../../app/draft-files'

import { classes } from '../../ui/components/common/classes'
import styles from '../../ui/components/chat/Composer.module.css'
import { MentionAnchor } from '../../ui/components/chat/MentionList'
import {
  SessionLoginLabel,
  type SessionLogin,
} from '../../ui/components/chat/SessionLogin'
import { useShortcutOffer } from '../../shell/shortcuts/shortcut-context'
import type { Draft, MentionRequest } from '../state/chat-snapshot'
import { IconButton } from '../ui/actions'
import { FolderNotice, noticedFolder, OversizeNotice } from './AttachmentChips'
import type { FieldFiles } from './chip-field/attached-files'
import { ChipTextField } from './chip-field/ChipTextField'
import type { FieldHandle } from './chip-field/focus-plugins'
import local from './chat.module.css'
import { useDropAreaHandlers } from './chat-drop-area'
import { useComposerDrop } from './composer-drop'
import { SendButton, StopButton } from './ComposerButtons'
import { ComposerStart } from './ComposerMenu'
import type { ComposerTool } from './ComposerTools'
import {
  useRequestedFocus,
  useRequestedMention,
  type ComposerFocus,
} from './composer-requests'
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
  /** The favourites of the reader, which the model menu lists first. */
  favourites?: readonly AgentChoice[]
  /** The agent of a session with messages (decision 51). */
  sessionAgent?: Agent
  /** A turn runs, so a message steers it, and Stop ends it. */
  running: boolean
  stopping: boolean
  sending: boolean
  /** A notice says why a message cannot go yet, so Send is off. */
  blocked: boolean
  /**
   * The agent login that a message uses when it is not the reader's own:
   * the login of another member, or the org login, which a label in the
   * bar names. A message on the reader's own login has no label.
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
   * event. A dropped folder comes as its zip. `refusals` names each folder
   * of a drop whose zip is too large or that the browser could not read.
   */
  onAttach: (
    files: readonly File[],
    refusals?: IntakeRefusals,
  ) => readonly string[]
  onChooseModel: (choice: AgentChoice) => void
  /** The field takes the focus when it shows, as `ComposerFocus` says. */
  focus?: ComposerFocus | null
  /**
   * The tools of the host, such as Capabilities. A computer shows each icon
   * after the attach button. A phone holds Attach files and the tools in
   * the menu of one + button.
   */
  tools?: readonly ComposerTool[]
  /**
   * The chip that Add to chat asks the field for. The field takes it once,
   * when the composer shows it, as `useRequestedMention` says.
   */
  mention?: MentionRequest | null
  /** The field took the chip of `mention`. */
  onMentionTaken?: (request: MentionRequest) => void
  /**
   * Takes the handle of the message field, for the chat that moves the
   * focus to it, such as after the last open request leaves the stack.
   */
  fieldRef?: RefObject<FieldHandle | null>
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
 * place, then a bar with the attach button, the icons of the tools of the
 * host, such as Capabilities, the model picker, and Send. A phone holds
 * Attach files and the tools in the menu of one + button, and shows Stop as
 * its icon, so the model and a login label stay readable. The
 * files of a pick go into the text at the caret, or at the end when the text
 * has no caret, and a chip that leaves the text takes its file off the
 * draft. The whole box takes a drop of files, as `useComposerDrop` says,
 * also while a message sends or a file uploads. In the chat, the whole
 * column takes it for the box, as `useChatDropArea` says. Send waits while
 * a file uploads or failed. Files over the size limit and a folder that
 * could not be read get a notice over the box, which can open the file
 * picker again.
 * While a turn runs, a message steers the turn, and Stop sits beside Send.
 * While the sandbox is not ready, Send still sends, and the workspace queues
 * the message. When a message spends the agent login of another member or
 * the org login, a label after the model picker names that login, so the
 * box keeps its place.
 * Enter follows the shared rule of `useSendKey`: on desktop, Enter sends and
 * Shift+Enter starts a new line. The text field asks the send key before it
 * adds a line, so Enter never adds a line to a message that it sends. A
 * pasted workspace link shows as a chip, and the draft keeps the plain link.
 * In a chat with the files of its workspace, `@` opens the list of the files
 * and folders just above the box, and a pick shows as a file chip. There,
 * `/` opens the list of the skills of the agent of the chosen model, and a
 * pick shows as a skill chip. A focus
 * request, such as from a click on the workspace in the sidebar, puts the
 * caret in the field when it shows. The chip of Add to chat goes into the
 * field when it shows, before the focus of a request of the same render.
 */
export function Composer(props: ComposerProps) {
  const picker = useRef<HTMLInputElement>(null)
  const ownField = useRef<FieldHandle>(null)
  const field = props.fieldRef ?? ownField
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
  const focus = props.focus ?? null
  useRequestedMention(field, props.mention ?? null, props.onMentionTaken, focus)
  useRequestedFocus(field, focus)
  // The field takes changes while the composer shows, so the box takes a
  // drop also while Send is off.
  const drop = useComposerDrop({
    field,
    editable: true,
    attach: props.onAttach,
  })
  const boxDrops = useDropAreaHandlers(drop.handlers)
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
            {...boxDrops}
          >
            <ChipTextField
              agent={props.choice.agent}
              caretAtEnd
              files={props.files}
              handle={field}
              label="Message"
              lines={2}
              maxLines={8}
              mentionHost={mentionHost}
              onAttach={props.onAttach}
              onChangeText={props.onChangeText}
              onEnter={sendKey}
              owner={draft.id}
              placeholder={
                steers ? 'Steer the agent while it works' : 'Message the agent'
              }
              value={draft.text}
            />
            <div className={styles.bar}>
              <ComposerStart
                attach={pick}
                attachButton={
                  <IconButton
                    icon={Paperclip}
                    label="Attach files"
                    onPress={pick}
                    shortcut="attach-files"
                  />
                }
                tools={props.tools ?? []}
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
                favourites={props.favourites}
                models={props.models}
                onChoose={props.onChooseModel}
                sessionAgent={props.sessionAgent}
              />
              {props.login ? <SessionLoginLabel {...props.login} /> : null}
              <span className={styles.spacer} />
              {props.running ? (
                <StopButton onStop={props.onStop} stopping={props.stopping} />
              ) : null}
              <SendButton
                off={off}
                onSend={props.onSend}
                sending={props.sending}
              />
            </div>
          </div>
        </MentionAnchor>
      </div>
    </>
  )
}
