import type { FileEntry } from '../../shared/generated/FileEntry'
import { entryName } from '../../ui/components/chat/entryPaths'
import { FileChip } from '../../ui/components/chat/FileChip'
import { SentFileChip } from '../../ui/components/chat/SentFileChip'
import { lineLabel } from '../../shared/line-target'
import { MentionIcon } from '../mentions/MentionIcon'
import { useChatMentions } from '../mentions/MentionsContext'
import type { AttachmentPart, FilePart } from './chat-parts'
import { fileOpener, fileTitle } from './file-opener'

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
export function AttachmentLink(props: {
  part: AttachmentPart
  opens: boolean
}) {
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
