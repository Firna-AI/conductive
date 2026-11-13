import { SessionChip } from '../../../docs/mockups/src/components/chat/SessionChip'
import { SkillChip } from '../../../docs/mockups/src/components/chat/SkillChip'
import {
  WorkspaceChip,
  type ChipOpener,
} from '../../../docs/mockups/src/components/chat/WorkspaceChip'
import inline from '../../../docs/mockups/src/components/common/InlineText.module.css'
import { routes } from '../../app/router'
import type { Attachment } from '../../shared/messages'
import { sessionLink } from '../../shared/session-link'
import { isPlainClick } from '../../shell/ui/AppLink'
import { findSkill, useMentionSkills } from '../mentions/mention-skills'
import { findMentioned, useMentionTree } from '../mentions/MentionsContext'
import {
  chatParts,
  type ChatPart,
  type MentionLookup,
  type SkillLookup,
} from './chat-parts'
import { AttachmentLink, FileLink } from './file-links'
import { chipOf, useChatLinks } from './LinksContext'
import { sessionChipOf, useLinkedSession } from './session-links'
import { sessionTarget, type LinkTarget } from './workspace-links'

/**
 * A workspace in a sent message or an answer: a link of the app to the page
 * that the link names. A link to a known session shows as its session chip.
 * A plain click opens it in the same window, as the other links of the app
 * do. A click with a modifier key stays with the browser, such as a new tab.
 */
function LinkChip(props: { target: LinkTarget }) {
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

function Part(props: { part: ChatPart; opens: boolean }) {
  const { part } = props
  if (part.kind === 'text') return part.text
  if (part.kind === 'code') {
    return <code className={inline.code}>{part.text}</code>
  }
  if (part.kind === 'file') {
    return <FileLink entry={part.entry} source={part.source} />
  }
  if (part.kind === 'attachment') {
    return <AttachmentLink opens={props.opens} part={part} />
  }
  if (part.kind === 'skill') {
    // A press on a skill chip opens nothing. Its title is the description.
    const { name, description } = part.skill
    return <SkillChip mention={part.source} skill={{ name, description }} />
  }
  return <LinkChip target={part.target} />
}

/** A run of bold text and chips, or one part without bold. */
type Run =
  { kind: 'strong'; parts: ChatPart[] } | { kind: 'part'; part: ChatPart }

/** The parts in runs, so that one `<strong>` holds each run of bold parts. */
function runsOf(parts: readonly ChatPart[]): Run[] {
  const runs: Run[] = []
  for (const part of parts) {
    const last = runs.at(-1)
    if (part.kind === 'code' || !part.strong) runs.push({ kind: 'part', part })
    else if (last?.kind === 'strong') last.parts.push(part)
    else runs.push({ kind: 'strong', parts: [part] })
  }
  return runs
}

/** The lookup of the mentions of a message, while the chat has a tree. */
function useMentionLookup(read: boolean): MentionLookup | undefined {
  const tree = useMentionTree(read)
  if (!tree) return undefined
  return (mention) => findMentioned(tree, mention.path, mention.folder)
}

/**
 * The lookup of the skill texts of a message, while the chat has skill
 * lists. Without a list, such as while it loads or in an archived
 * workspace, each skill text stays text.
 */
function useSkillLookup(read: boolean): SkillLookup | undefined {
  const skills = useMentionSkills(read)
  if (skills?.state !== 'ready') return undefined
  return (name) => findSkill(skills, name)
}

/** How the chat reads a text: as an answer, or as a message of a member. */
export interface TextReading {
  /** `**` marks bold, as in an answer. */
  strong?: boolean
  /**
   * Each mention of an entry of the file tree is a file chip, and each
   * skill text of a skill of either agent is a skill chip.
   */
  mentions?: boolean
  /** The files of a sent message. The mention of each is its chip. */
  attachments?: readonly Attachment[]
}

/**
 * The parts of a text, as `chatParts` reads it with the workspaces of the
 * chat. With `mentions`, it follows the tree of the chat for the chips of
 * the files, and the skill lists for the chips of the skills.
 */
export function useChatParts(text: string, reading: TextReading): ChatPart[] {
  const { links } = useChatLinks()
  const lookup = useMentionLookup(reading.mentions ?? false)
  const skills = useSkillLookup(reading.mentions ?? false)
  return chatParts(text, links, {
    strong: reading.strong ?? false,
    mentions: lookup,
    skills,
    attachments: reading.attachments,
  })
}

/**
 * Draws the parts of a text: text, code, and chips. One `<strong>` holds
 * each run of bold text and chips. `opens` says whether the chip of an
 * attached file opens its copy: only after its message went out to the
 * agent.
 */
export function ChatText(props: {
  parts: readonly ChatPart[]
  opens?: boolean
}) {
  const opens = props.opens ?? false
  return (
    <>
      {runsOf(props.parts).map((run, index) =>
        run.kind === 'part' ? (
          <Part key={index} opens={opens} part={run.part} />
        ) : (
          <strong key={index}>
            {run.parts.map((part, inner) => (
              <Part key={inner} opens={opens} part={part} />
            ))}
          </strong>
        ),
      )}
    </>
  )
}

/**
 * Text of a sent message or of an answer, as `chatParts` reads it: code,
 * and each workspace link as a chip. With `strong`, as in an answer, `**`
 * marks bold, and one `<strong>` holds each run of bold text and chips.
 * With `mentions`, as in a message of a member, each mention of an entry of
 * the file tree is a file chip.
 */
export function LinkedText(props: {
  text: string
  strong?: boolean
  mentions?: boolean
}) {
  return <ChatText parts={useChatParts(props.text, props)} />
}
