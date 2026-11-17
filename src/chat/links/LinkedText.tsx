import type { FileEntry } from '../../shared/generated/FileEntry'
import type { Attachment } from '../../shared/generated/Attachment'
import { entryName } from '../../../docs/mockups/src/components/chat/entryPaths'
import { FileChip } from '../../../docs/mockups/src/components/chat/FileChip'
import { SentFileChip } from '../../../docs/mockups/src/components/chat/SentFileChip'
import { SessionChip } from '../../../docs/mockups/src/components/chat/SessionChip'
import {
  WorkspaceChip,
  type ChipOpener,
} from '../../../docs/mockups/src/components/chat/WorkspaceChip'
import { routes } from '../../app/router'
import { lineLabel } from '../../shared/line-target'
import { sessionLink } from '../../shared/session-link'
import { isPlainClick } from '../../shell/ui/AppLink'
import { useTextLinks } from '../../shell/ui/text-links'
import { MentionIcon } from '../mentions/MentionIcon'
import {
  findMentioned,
  useChatMentions,
  useMentionTree,
} from '../mentions/MentionsContext'
import {
  chatParts,
  type AttachmentPart,
  type ChatPart,
  type EntryLookup,
  type FilePart,
} from './chat-parts'
import { fileOpener, fileTitle } from './file-opener'
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
 * A file or a folder in a sent message or an answer: a link of the app to
 * the file, or to All files with the folder open, as a press in All files
 * opens them. A file with `lines` opens as text at the lines, and its name
 * and title end with them, as in `app.ts:42`. A click with a modifier key
 * stays with the browser.
 */
export function FileLink(props: { part: FilePart }) {
  const mentions = useChatMentions()
  const { entry, lines } = props.part
  const folder = entry.kind === 'directory'
  const at = lines ? `:${lineLabel(lines)}` : ''
  return (
    <FileChip
      entry={{ path: entry.path, folder }}
      icon={<MentionIcon entry={entry} size={12} />}
      mention={props.part.source}
      lines={at || undefined}
      name={entry.name}
      opener={
        mentions
          ? (chip) => <a {...chip} {...fileOpener(mentions, entry, lines)} />
          : undefined
      }
      title={fileTitle(entry, lines)}
    />
  )
}

/**
 * An attached file of a sent message, at the place of its mention: a link
 * of the app to the file tab of the copy of the file, as a file chip opens
 * its file. A click with a modifier key stays with the browser. While the
 * message has not gone out, `opens` is false, because the copy does not
 * exist yet. Then, and in a chat without the files of the workspace, such
 * as an archived one, the chip opens nothing.
 */
function AttachmentLink(props: { part: AttachmentPart; opens: boolean }) {
  const mentions = useChatMentions()
  const files = props.opens ? mentions : null
  const { path } = props.part
  const copy: FileEntry = {
    path,
    name: entryName({ path }),
    kind: 'file',
    change: null,
  }
  return (
    <SentFileChip
      file={props.part.attachment}
      mention={props.part.source}
      opener={
        files
          ? (chip) => <a {...chip} {...fileOpener(files, copy, null)} />
          : undefined
      }
    />
  )
}

function Part(props: { part: ChatPart; opens: boolean }) {
  const { part } = props
  if (part.kind === 'text') return part.text
  if (part.kind === 'code') return <CodeText part={part} />
  if (part.kind === 'link') return <WebLinkText part={part} />
  if (part.kind === 'file') return <FileLink part={part} />
  if (part.kind === 'attachment') {
    return <AttachmentLink opens={props.opens} part={part} />
  }
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

/** How the chat reads the text of a sent message. */
export interface TextReading {
  /** Each mention of an entry of the file tree is a file chip. */
  mentions?: boolean
  /** The files of a sent message. The mention of each is its chip. */
  attachments?: readonly Attachment[]
}

/**
 * The parts of a sent message, as `chatParts` reads it with the workspaces
 * of the chat, and with the web links of the screen that shows it. With
 * `mentions`, a text with a `@` follows the tree of the chat for the chips
 * of the files, so a change of the tree draws only the texts that can
 * change.
 */
export function useChatParts(text: string, reading: TextReading): ChatPart[] {
  const { links } = useChatLinks()
  const lookup = useEntryLookup(reading.mentions === true && text.includes('@'))
  const { linkOf } = useTextLinks()
  return chatParts(text, links, {
    web: linkOf,
    mentions: lookup,
    attachments: reading.attachments,
  })
}

/**
 * Draws the parts of a sent message: text, code, chips, and links. `opens`
 * says whether the chip of an attached file opens its copy: only after its
 * message went out to the agent.
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
