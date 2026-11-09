import { WorkspaceChip } from '../../../docs/mockups/src/components/chat/WorkspaceChip'
import inline from '../../../docs/mockups/src/components/common/InlineText.module.css'
import { isPlainClick } from '../../shell/ui/AppLink'
import { chipOf, useChatLinks } from './LinksContext'
import { linkedParts, type LinkTarget } from './workspace-links'

/**
 * A workspace in a sent message or an answer: a link of the app to the page
 * that the link names. A plain click opens it in the same window, as the
 * other links of the app do. A click with a modifier key stays with the
 * browser, such as a new tab.
 */
function LinkChip(props: { target: LinkTarget }) {
  const { open } = useChatLinks()
  const { to } = props.target
  return (
    <WorkspaceChip
      opener={(chip) => (
        <a
          {...chip}
          href={to}
          onClick={(event) => {
            if (!open || !isPlainClick(event)) return
            event.preventDefault()
            open(to)
          }}
        />
      )}
      workspace={chipOf(props.target.workspace)}
    />
  )
}

/**
 * Text of a message or an answer, with each workspace link as a chip. With
 * `code`, each part in backticks is code, as in a sent message. Every other
 * link stays as the text has it.
 */
export function LinkedText(props: { text: string; code: boolean }) {
  const { links } = useChatLinks()
  return (
    <>
      {linkedParts(props.text, links, props.code).map((part, index) => {
        if (part.kind === 'text') return part.text
        if (part.kind === 'code') {
          return (
            <code className={inline.code} key={index}>
              {part.text}
            </code>
          )
        }
        return <LinkChip key={index} target={part.target} />
      })}
    </>
  )
}
