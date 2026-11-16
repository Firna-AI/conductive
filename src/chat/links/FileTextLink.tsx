import inline from '../../../docs/mockups/src/components/common/InlineText.module.css'
import { useChatMentions } from '../mentions/MentionsContext'
import type { FileLinkPart } from './chat-parts'
import { fileOpener, fileTitle } from './file-opener'

/**
 * A Markdown link or image of an answer to a file of the tree: a normal
 * link with the label that the agent wrote, which opens the file, as a file
 * chip does. A target with lines opens the file as text at the lines. A
 * click with a modifier key stays with the browser. Its title is the path,
 * with its lines. A copy gives the label, as for each other link.
 */
export function FileTextLink(props: { part: FileLinkPart }) {
  const mentions = useChatMentions()
  const { entry, lines, label } = props.part
  const text = label.map((part, index) =>
    part.kind === 'code' ? (
      <code className={inline.code} key={index}>
        {part.text}
      </code>
    ) : part.strong ? (
      <strong key={index}>{part.text}</strong>
    ) : (
      part.text
    ),
  )
  if (!mentions) return <>{text}</>
  return (
    <a
      className={inline.link}
      {...fileOpener(mentions, entry, lines)}
      title={fileTitle(entry, lines)}
    >
      {text}
    </a>
  )
}
