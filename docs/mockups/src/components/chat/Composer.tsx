import { Button } from '@firna/ui/button'
import { ArrowUp, Paperclip, Square } from 'lucide-react'
import type { AgentChoice, AgentKey } from '../../fixtures/agents'
import type { Attachment } from '../../fixtures/attachments'
import { noop } from '../../noop'
import { ScreenLink } from '../common/ScreenLink'
import { ActionButton, IconButton } from '../common/actions'
import { classes } from '../common/classes'
import { useControlSizes } from '../common/touch'
import { FileMentionList, type MentionTree } from './FileMentionList'
import { MentionAnchor } from './MentionList'
import { MessageField } from './MessageField'
import { ModelPicker } from './ModelPicker'
import { SessionLoginLabel, type SessionLogin } from './SessionLogin'
import { SkillMentionList, type SkillSource } from './SkillMentionList'
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
  /**
   * The text of the message. Each attached file is a chip at its mark in
   * the text.
   */
  draft: string
  /**
   * The attached files, whose chips stand in the text. Send waits while a
   * file uploads, and while a failed upload waits for Try again or its
   * removal, so a message goes with all of its files.
   */
  attachments: readonly Attachment[]
  /**
   * Files hover over the box, so the box shows the drop state: a full
   * border in the accent colour. A drop on the text puts the files at the
   * caret under the pointer, and a drop on the rest of the box puts them
   * at the caret, or at the end.
   */
  drop?: boolean
  /**
   * A view runs no script, so this draws the caret at that index of the
   * draft: the drop caret during a drag, or the caret after a drop or a
   * pick.
   */
  caret?: number
  /** The screen that the attach button leads to, when the mockups draw it. */
  attachTo?: string
  /** The model picker is open. */
  picker?: boolean
  /**
   * The agent of the session, once it has messages. A model of the other
   * agent opens a new session with the draft (decision 51).
   */
  sessionAgent?: AgentKey
  /**
   * The models that the picker leaves out: in a session of the viewer on an
   * own endpoint login, the models that the model list of the endpoint does
   * not name.
   */
  hiddenModels?: readonly string[]
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
  /**
   * The list of `@` is open above the box, for the query after the last `@`
   * of the draft, with the file tree as the workspace has it.
   */
  mention?: MentionTree
  /**
   * The list of `/` is open above the box, for the query after the last `/`
   * of the draft, with the skills as the workspace has them.
   */
  skills?: SkillSource
  /**
   * A view has no pointer, so this draws it over the icon of the first chip
   * of the text.
   */
  pointer?: boolean
}

/**
 * The query of a list: the text after the last `@` of the draft for the
 * list of files, or after the last `/` for the list of skills.
 */
function queryAfter(draft: string, mark: '@' | '/'): string {
  return draft.slice(draft.lastIndexOf(mark) + 1)
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
 * The message box: the text, with a chip for each attached file at its
 * place, then a bar with the attach button, the model picker, and Send.
 * The attach button puts each picked file at the caret, or at the end. The
 * whole box takes a drop of files, and shows the drop state while files
 * hover over it. While a turn runs, a message steers the turn unless it
 * starts a new linked session. Stop ends the running turn. While the
 * sandbox is not ready, also during and after a failed first start, Send
 * queues the message in the workspace. Send waits for the uploads of the
 * files, whose chips show their state. When a message spends the agent
 * login of another member, a label after the model picker names that
 * login, so the box keeps its place. A pasted workspace link shows as a
 * chip, and the draft keeps the plain link. `@` opens the list of the
 * files and folders of the workspace above the box, and a pick puts a file
 * chip into the text. `/` opens the list of skills in the same place, and
 * a pick puts a skill chip into the text.
 */
export function Composer(props: ComposerState & { lines?: number }) {
  const steers = props.running && props.startsSession !== true
  const placeholder = steers
    ? 'Steer the agent while it works'
    : (props.placeholder ?? 'Message the agent')
  const uploads = props.attachments.some((file) => file.state !== undefined)
  const off = props.blocked === true || uploads
  const attach = <IconButton icon={Paperclip} label="Attach files" />
  return (
    <div className={styles.wrap}>
      <MentionAnchor>
        {props.mention ? (
          <FileMentionList
            query={queryAfter(props.draft, '@')}
            tree={props.mention}
          />
        ) : null}
        {props.skills ? (
          <SkillMentionList
            query={queryAfter(props.draft, '/')}
            source={props.skills}
          />
        ) : null}
        <div
          className={classes(styles.composer, props.drop && styles.dropping)}
        >
          <MessageField
            caret={props.caret}
            files={props.attachments}
            lines={props.lines ?? 2}
            maxLines={8}
            placeholder={placeholder}
            pointer={props.pointer}
            text={props.draft}
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
              hiddenModels={props.hiddenModels}
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
      </MentionAnchor>
    </div>
  )
}
