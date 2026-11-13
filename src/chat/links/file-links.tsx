import { entryName } from '../../../docs/mockups/src/components/chat/entryPaths'
import { FileChip } from '../../../docs/mockups/src/components/chat/FileChip'
import { SentFileChip } from '../../../docs/mockups/src/components/chat/SentFileChip'
import type { FileEntry } from '../../shared/files'
import { isPlainClick } from '../../shell/ui/AppLink'
import { MentionIcon } from '../mentions/MentionIcon'
import { useChatMentions } from '../mentions/MentionsContext'
import type { AttachmentPart } from './chat-parts'

/**
 * A file or a folder in a sent message: a link of the app to the file, or
 * to All files with the folder open, as a press in All files opens them.
 * A click with a modifier key stays with the browser.
 */
export function FileLink(props: { entry: FileEntry; source: string }) {
  const mentions = useChatMentions()
  const { entry } = props
  const folder = entry.kind === 'directory'
  return (
    <FileChip
      entry={{ path: entry.path, folder }}
      icon={<MentionIcon entry={entry} size={12} />}
      mention={props.source}
      name={entry.name}
      opener={
        mentions
          ? (chip) => (
              <a
                {...chip}
                href={mentions.href(entry)}
                onClick={(event) => {
                  if (!isPlainClick(event)) return
                  event.preventDefault()
                  if (folder) mentions.showFolder(entry.path)
                  else mentions.openFile(entry.path)
                }}
              />
            )
          : undefined
      }
      title={folder ? `${entry.path}/` : entry.path}
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
          ? (chip) => (
              <a
                {...chip}
                href={files.href(copy)}
                onClick={(event) => {
                  if (!isPlainClick(event)) return
                  event.preventDefault()
                  files.openFile(path)
                }}
              />
            )
          : undefined
      }
    />
  )
}
