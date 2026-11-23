import type { ReactNode } from 'react'
import inline from '../../ui/components/common/InlineText.module.css'
import { useChatMentions } from '../mentions/MentionsContext'
import { fileOpener, fileTitle } from '../links/file-opener'
import type { FileTarget } from '../links/file-targets'

/**
 * A Markdown link or image of an agent message to a file of the tree: a
 * normal link with the label that the agent wrote, which opens the file,
 * as a file chip does. A target with lines opens the file as text at the
 * lines. A click with a modifier key stays with the browser. Its title is
 * the path, with its lines. A copy gives the label, as for each other
 * link. Without the files of the workspace, the label shows alone.
 */
export function FileTextLink(props: FileTarget & { children: ReactNode }) {
  const mentions = useChatMentions()
  const { entry, lines } = props
  if (!mentions) return props.children
  return (
    <a
      className={inline.link}
      {...fileOpener(mentions, entry, lines)}
      title={fileTitle(entry, lines)}
    >
      {props.children}
    </a>
  )
}
