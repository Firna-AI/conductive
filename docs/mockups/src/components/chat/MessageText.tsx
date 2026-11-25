import {
  chatParts,
  filesWithoutChip,
  type AttachmentPart,
  type ChatPart,
} from '../../../../../src/chat/links/chat-parts'
import type { Attachment } from '../../fixtures/attachments'
import { paths } from '../../paths'
import { skillTabOf } from '../../skillPaths'
import { ScreenLink } from '../common/ScreenLink'
import { appAttachment, findEntry, findSkill } from './chatReading'
import { useChatWorkspaces } from './chatWorkspaces'
import { ReadChip } from './LinkChip'
import { MentionChip } from './MentionChip'
import { SentFileChip } from '../../../../../src/ui/components/chat/SentFileChip'
import { SkillChip } from '../../../../../src/ui/components/chat/SkillChip'
import { CodeText, WebLinkText } from './WebLinkText'
import { webLinkOf } from './workspaceLinks'

/** The file tab of the copy of an attached file, when the mockups draw it. */
const attachedTabs = { picture: paths.attachmentOpen } as const

/**
 * The chip of an attached file of a sent message, at the place of its
 * mention. It opens the file tab of the copy of the file, when the mockups
 * draw it. While its message `waits` for the cloud computer, its copy does
 * not exist yet, so the chip opens nothing.
 */
function AttachedChip(props: {
  part: AttachmentPart
  files: readonly Attachment[]
  waits?: boolean
}) {
  const { part } = props
  const file = props.files.find((item) => item.id === part.attachment.id)
  const tab = props.waits === true ? undefined : file?.tab
  const to = tab ? attachedTabs[tab] : undefined
  return (
    <SentFileChip
      file={part.attachment}
      mention={part.source}
      opener={to ? (chip) => <ScreenLink {...chip} to={to} /> : undefined}
    />
  )
}

/**
 * The chip of a skill in a sent message. A press opens the skill in the
 * temporary tab (skill tab decision 1 B), when the mockups draw its tab. A
 * view cannot hover, so `pointer` draws the pointer over the chip, with
 * the fill of a hover, as the shared `SkillChip` says. Where no pointer
 * hovers, as on a phone, it draws none.
 */
function SentSkillChip(props: {
  part: Extract<ChatPart, { kind: 'skill' }>
  pointer: boolean
}) {
  const { part } = props
  const to = skillTabOf(part.skill.name)
  return (
    <SkillChip
      mention={part.source}
      opener={to ? (chip) => <ScreenLink {...chip} to={to} /> : undefined}
      pointer={props.pointer}
      skill={part.skill}
    />
  )
}

/** One part of a sent message, as `chatParts` of the app reads it. */
function Part(props: {
  part: ChatPart
  files: readonly Attachment[]
  waits?: boolean
  pointer: boolean
}) {
  const { part } = props
  switch (part.kind) {
    case 'text':
      return part.text
    case 'code':
      return <CodeText part={part} />
    case 'chip':
      return <ReadChip target={part.target} text={part.source} />
    case 'link':
      return <WebLinkText link={part.link}>{part.text}</WebLinkText>
    case 'file':
      return <MentionChip part={part} />
    case 'skill':
      return <SentSkillChip part={part} pointer={props.pointer} />
    case 'attachment':
      return (
        <AttachedChip files={props.files} part={part} waits={props.waits} />
      )
  }
}

/**
 * The parts of the text of a message of a member, as `chatParts` of the app
 * reads it with the workspaces of the chat: its code, links, and chips.
 * Each mention of an entry of the tree is a file chip, each skill text of a
 * skill of the list is a skill chip, and each mention of the copy path of
 * one of the `files` of the message is the chip of that file.
 */
export function useSentParts(
  text: string,
  files: readonly Attachment[],
  mentions = true,
): ChatPart[] {
  return chatParts(text, useChatWorkspaces().links, {
    web: webLinkOf,
    mentions: mentions ? findEntry : undefined,
    skills: mentions ? findSkill : undefined,
    attachments: files.map(appAttachment),
  })
}

/**
 * The text of a message of a member, as typed, from its `parts`. Each part
 * in backticks is code, and each link to a workspace of the org is a chip
 * that opens the workspace, when the mockups draw its screen. A link to a
 * session that the chat read is a session chip that opens the session.
 * Each other `http` and `https` address is a link, and a Markdown link
 * shows as typed. Code that holds only an address shows it as a link in its
 * code box, and other code stays code. Each file chip opens its file, and
 * each skill chip opens its skill tab. `AnswerText` draws the text of an
 * answer.
 *
 * `files` are the attached files of the message. The chip of each opens
 * the file tab of its copy. While the message `waits` for the cloud
 * computer, its copies do not exist yet, so the chip of a file opens
 * nothing. A view cannot hover, so `pointer` draws the pointer over the
 * first skill chip.
 */
export function MessageText(props: {
  parts: readonly ChatPart[]
  files: readonly Attachment[]
  waits?: boolean
  pointer?: boolean
}) {
  const firstSkill = props.parts.findIndex((part) => part.kind === 'skill')
  return props.parts.map((part, index) => (
    <Part
      files={props.files}
      key={index}
      part={part}
      pointer={props.pointer === true && index === firstSkill}
      waits={props.waits}
    />
  ))
}

/**
 * The files of a sent message that no part of its text shows as a chip,
 * such as the files of a message from before files had a place in the
 * text. They show under the message.
 */
export function filesWithoutPlace(
  parts: readonly ChatPart[],
  files: readonly Attachment[],
): Attachment[] {
  const listed = new Set(
    filesWithoutChip(parts, files.map(appAttachment)).map((file) => file.id),
  )
  return files.filter((file) => listed.has(file.id))
}
