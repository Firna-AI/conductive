import { SessionChip } from '../../ui/components/chat/SessionChip'
import {
  WorkspaceChip,
  type ChipOpener,
} from '../../ui/components/chat/WorkspaceChip'
import { routes } from '../../app/router'
import type { Agent } from '../../shared/generated/Agent'
import type { Attachment } from '../../shared/generated/Attachment'
import { sessionLink } from '../../shared/session-link'
import { isPlainClick } from '../../shell/ui/AppLink'
import { useTextLinks } from '../../shell/ui/text-links'
import { findListedSkill } from '../mentions/mention-skills'
import {
  findMentioned,
  useMentionSkills,
  useMentionTree,
} from '../mentions/MentionsContext'
import { chatParts, type ChatPart, type EntryLookup } from './chat-parts'
import type { SkillLookup } from './chat-tokens'
import { AttachmentLink, FileLink } from './FileChips'
import { chipOf, useChatLinks } from './LinksContext'
import { sessionChipOf, useLinkedSession } from './session-links'
import { SkillLink } from './SkillLink'
import { CodeText, WebLinkText } from './WebLinkText'
import { sessionTarget, type LinkTarget } from './workspace-links'

/**
 * A workspace in a sent message or an answer: a link of the app to the page
 * that the link names. A link to a known session shows as its session chip.
 * A plain click opens it in the same window, as the other links of the app
 * do. A click with a modifier key stays with the browser, such as a new tab.
 */
export function LinkChip(props: { target: LinkTarget }) {
  const { open } = useChatLinks()
  const session = useLinkedSession(props.target)
  const { to, workspace } = props.target
  const opener = (chip: ChipOpener) => (
    <a
      {...chip}
      href={to}
      onClick={(event) => {
        if (!open || !isPlainClick(event)) return
        event.preventDefault()
        open(to)
      }}
    />
  )
  return session ? (
    <SessionChip opener={opener} session={sessionChipOf(workspace, session)} />
  ) : (
    <WorkspaceChip opener={opener} workspace={chipOf(workspace)} />
  )
}

/**
 * A session that the chat names by its IDs, such as the session whose agent
 * stopped a turn, as the chat shows the link of that session: its session
 * chip, or the chip of its workspace while the chat does not hold the
 * session. When no workspace of the list matches, the link stays text.
 * Outside a chat, which gives no origin, the text is the address of the
 * session in the app.
 */
export function SessionLinkText(props: {
  workspaceId: string
  sessionId: string
}) {
  const { links, origin } = useChatLinks()
  const target = sessionTarget(props, links)
  if (target) return <LinkChip target={target} />
  const { workspaceId, sessionId } = props
  return origin === undefined
    ? routes.session(links.orgId, workspaceId, sessionId)
    : sessionLink(origin, links.orgId, workspaceId, sessionId)
}

/**
 * One part of a sent message. A file and an attached file draw through the
 * chips of `FileChips.tsx`, and a skill through `SkillLink`.
 */
function Part(props: { part: ChatPart; opens: boolean }) {
  const { part } = props
  if (part.kind === 'text') return part.text
  if (part.kind === 'code') return <CodeText part={part} />
  if (part.kind === 'link') return <WebLinkText part={part} />
  if (part.kind === 'file') return <FileLink part={part} />
  if (part.kind === 'attachment') {
    return <AttachmentLink opens={props.opens} part={part} />
  }
  if (part.kind === 'skill') return <SkillLink part={part} />
  return <LinkChip target={part.target} />
}

/**
 * The lookup of the entries of the tree, while the chat has a tree. With
 * `read` false, the text follows no change of the tree, and finds nothing.
 */
export function useEntryLookup(read: boolean): EntryLookup | undefined {
  const tree = useMentionTree(read)
  if (!tree) return undefined
  return (path, folder) => findMentioned(tree, path, folder)
}

/**
 * The lookup of the skill texts of a message, while the chat has skill
 * lists. The list of `agent` comes first, so a chip names the skill of the
 * agent that the message went to when it has one. The skill part keeps
 * the agent whose list holds the skill, so the title of its chip and the
 * skill tab that it opens come from one lookup. Without a list, such as
 * while it loads or in an archived workspace, each skill text stays text.
 */
function useSkillLookup(
  read: boolean,
  agent: Agent | undefined,
): SkillLookup | undefined {
  const skills = useMentionSkills(read)
  if (skills?.state !== 'ready') return undefined
  return (name) => findListedSkill(skills, name, agent)
}

/** How the chat reads the text of a sent message. */
export interface TextReading {
  /** Each mention of an entry of the file tree is a file chip. */
  mentions?: boolean
  /**
   * Each skill text of a skill of either agent is a skill chip, as in a
   * message of a member. An answer keeps its skill texts as text.
   */
  skills?: boolean
  /**
   * The agent that the message went to. A skill chip names the skill of
   * this agent when it has one, else the skill of the other agent.
   */
  agent?: Agent
  /** The files of a sent message. The mention of each is its chip. */
  attachments?: readonly Attachment[]
}

/**
 * The parts of a sent message, as `chatParts` reads it with the workspaces
 * of the chat, and with the web links of the screen that shows it. With
 * `mentions`, a text with a `@` follows the tree of the chat for the chips
 * of the files, so a change of the tree draws only the texts that can
 * change. With `skills`, it follows the skill lists for the skill chips.
 */
export function useChatParts(text: string, reading: TextReading): ChatPart[] {
  const { links } = useChatLinks()
  const lookup = useEntryLookup(reading.mentions === true && text.includes('@'))
  const { linkOf } = useTextLinks()
  const skills = useSkillLookup(reading.skills ?? false, reading.agent)
  return chatParts(text, links, {
    web: linkOf,
    mentions: lookup,
    skills,
    attachments: reading.attachments,
  })
}

/**
 * Draws the parts of a sent message: text, code, chips, and links. `opens`
 * says whether the chip of an attached file opens its copy: only after its
 * message went out to the agent. A skill chip opens the skill of its part,
 * as `SkillLink` says.
 */
export function ChatText(props: {
  parts: readonly ChatPart[]
  opens?: boolean
}) {
  const opens = props.opens ?? false
  return props.parts.map((part, index) => (
    <Part key={index} opens={opens} part={part} />
  ))
}
