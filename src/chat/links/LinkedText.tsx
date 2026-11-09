import { WorkspaceChip } from '../../../docs/mockups/src/components/chat/WorkspaceChip'
import inline from '../../../docs/mockups/src/components/common/InlineText.module.css'
import { isPlainClick } from '../../shell/ui/AppLink'
import { chatParts, type ChatPart } from './chat-parts'
import { chipOf, useChatLinks } from './LinksContext'
import type { LinkTarget } from './workspace-links'

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

function Part(props: { part: ChatPart }) {
  const { part } = props
  if (part.kind === 'text') return part.text
  if (part.kind === 'code') {
    return <code className={inline.code}>{part.text}</code>
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

/**
 * Text of a sent message or of an answer, as `chatParts` reads it: code,
 * and each workspace link as a chip. With `strong`, as in an answer, `**`
 * marks bold, and one `<strong>` holds each run of bold text and chips.
 */
export function LinkedText(props: { text: string; strong?: boolean }) {
  const { links } = useChatLinks()
  const parts = chatParts(props.text, links, { strong: props.strong ?? false })
  return (
    <>
      {runsOf(parts).map((run, index) =>
        run.kind === 'part' ? (
          <Part key={index} part={run.part} />
        ) : (
          <strong key={index}>
            {run.parts.map((part, inner) => (
              <Part key={inner} part={part} />
            ))}
          </strong>
        ),
      )}
    </>
  )
}
