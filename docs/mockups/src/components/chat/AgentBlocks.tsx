import type { AgentBlock } from '../../fixtures/conversations'
import { MarkdownTable } from '../common/MarkdownTable'
import { MessageText } from './MessageText'

/** A cell of a table in a message, with the text of a paragraph. */
function messageCell(text: string) {
  return <MessageText text={text} />
}

/**
 * The blocks of a message of the agent, in order: its paragraphs and its
 * tables, then its list. Their text keeps its inline code, and each link to
 * a workspace of the org is a chip. The element around them sets the type
 * and the space between them.
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
            <MessageText text={block} />
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
              <MessageText text={bullet} />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}
