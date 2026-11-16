import { SessionChip } from '../../../docs/mockups/src/components/chat/SessionChip'
import { SkillChip } from '../../../docs/mockups/src/components/chat/SkillChip'
import {
  WorkspaceChip,
  type ChipOpener,
} from '../../../docs/mockups/src/components/chat/WorkspaceChip'
import { routes } from '../../app/router'
import type { Attachment } from '../../shared/generated/Attachment'
import { sessionLink } from '../../shared/session-link'
import { isPlainClick } from '../../shell/ui/AppLink'
import { useTextLinks } from '../../shell/ui/text-links'
import { findSkill, useMentionSkills } from '../mentions/mention-skills'
import {
  findMentioned,
  useMentionTree,
  useRepositoryFolder,
} from '../mentions/MentionsContext'
import { chatParts, type ChatPart, type EntryLookup } from './chat-parts'
import type { SkillLookup } from './chat-tokens'
import { AttachmentLink, FileLink } from './file-links'
import { FileTextLink } from './FileTextLink'
import { chipOf, useChatLinks } from './LinksContext'
import { sessionChipOf, useLinkedSession } from './session-links'
import { CodeText, WebLinkText } from './WebLinkText'
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
  if (part.kind === 'code') return <CodeText part={part} />
  if (part.kind === 'link') return <WebLinkText part={part} />
  if (part.kind === 'file') return <FileLink part={part} />
  if (part.kind === 'file-link') return <FileTextLink part={part} />
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

/** A run of bold text, chips, and links, or one part without bold. */
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

/** The lookup of the entries of the tree, while the chat has a tree. */
function useEntryLookup(read: boolean): EntryLookup | undefined {
  const tree = useMentionTree(read)
  if (!tree) return undefined
  return (path, folder) => findMentioned(tree, path, folder)
}

/**
 * Whether a text can hold a chip or a link of a file, so that it follows
 * the tree. A mention needs `@`, a path in code needs a backtick, and a
 * Markdown link needs `](`. So a change of the tree draws only the texts
 * that can change.
 */
function namesFiles(text: string, reading: TextReading): boolean {
  if (!reading.mentions) return false
  if (text.includes('@')) return true
  return reading.paths === true && (text.includes('`') || text.includes(']('))
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
  /** Each mention of an entry of the file tree is a file chip. */
  mentions?: boolean
  /**
   * Each skill text of a skill of either agent is a skill chip, as in a
   * message of a member. An answer keeps its skill texts as text.
   */
  skills?: boolean
  /**
   * Inline code that is the path of an entry of the tree is a file chip,
   * as in an answer. It needs `mentions`.
   */
  paths?: boolean
  /** The files of a sent message. The mention of each is its chip. */
  attachments?: readonly Attachment[]
}

/**
 * The parts of a text, as `chatParts` reads it with the workspaces of the
 * chat, and with the web links of the screen that shows it. With
 * `mentions`, it follows the tree of the chat for the chips of the files.
 * With `skills`, it follows the skill lists for the chips of the skills.
 */
export function useChatParts(text: string, reading: TextReading): ChatPart[] {
  const { links } = useChatLinks()
  const lookup = useEntryLookup(namesFiles(text, reading))
  const root = useRepositoryFolder()
  const { linkOf } = useTextLinks()
  const skills = useSkillLookup(reading.skills ?? false)
  return chatParts(text, links, {
    strong: reading.strong ?? false,
    web: linkOf,
    mentions: lookup,
    code: reading.paths ? { root } : undefined,
    skills,
    attachments: reading.attachments,
  })
}

/**
 * Draws the parts of a text: text, code, chips, and links. One `<strong>`
 * holds each run of bold text, chips, and links. `opens` says whether the
 * chip of an attached file opens its copy: only after its message went out
 * to the agent.
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

const answerReading: TextReading = { strong: true, mentions: true, paths: true }

/**
 * Text of an answer: bold, workspace chips, and a file chip for each
 * mention of an entry of the tree and for each path of one in inline code.
 */
export function AnswerText(props: { text: string }) {
  return <ChatText parts={useChatParts(props.text, answerReading)} />
}
