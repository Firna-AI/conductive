import type { AgentBlock } from '../../fixtures/conversations'
import { InlineText } from '../common/InlineText'
import { MarkdownTable } from '../common/MarkdownTable'

/** A cell of a table in a message, with its inline code. */
function messageCell(text: string) {
  return <InlineText text={text} />
}

/**
 * The blocks of a message of the agent, in order: its paragraphs and its
 * tables, then its list. The element around them sets the type and the
 * space between them.
 */
export function AgentBlocks(props: {
  blocks: readonly AgentBlock[]
  bullets?: readonly string[]
}) {
  return (
    <>
      {props.blocks.map((block, index) =>
        typeof block === 'string' ? (
          <p key={index}>
            <InlineText text={block} />
          </p>
        ) : (
          <MarkdownTable
            align={block.align}
            head={block.head}
            key={index}
            renderCell={messageCell}
            rows={block.rows}
          />
        ),
      )}
      {props.bullets ? (
        <ul>
          {props.bullets.map((bullet) => (
            <li key={bullet}>
              <InlineText text={bullet} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}
