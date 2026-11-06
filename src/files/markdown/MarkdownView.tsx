import { useMemo } from 'react'
import { inlineElements } from './inline-render'
import { parseMarkdown, type MdBlock, type MdListItem } from './markdown-blocks'
import styles from './MarkdownView.module.css'

type Definitions = ReadonlyMap<string, string>

const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

function Inline(props: { text: string; definitions: Definitions }) {
  return <>{inlineElements(props.text, props.definitions)}</>
}

function Item(props: { item: MdListItem; definitions: Definitions }) {
  const { item, definitions } = props
  const [first] = item.blocks
  const tight = item.blocks.length === 1 && first.kind === 'paragraph'
  return (
    <li className={item.checked === null ? undefined : styles.task}>
      {item.checked === null ? null : (
        <input defaultChecked={item.checked} disabled type="checkbox" />
      )}
      {tight ? (
        <Inline definitions={definitions} text={first.text} />
      ) : (
        <Blocks blocks={item.blocks} definitions={definitions} />
      )}
    </li>
  )
}

function Block(props: { block: MdBlock; definitions: Definitions }) {
  const { block, definitions } = props
  switch (block.kind) {
    case 'heading': {
      const Heading = headingTags[block.level - 1]
      return (
        <Heading>
          <Inline definitions={definitions} text={block.text} />
        </Heading>
      )
    }
    case 'paragraph':
      return (
        <p>
          <Inline definitions={definitions} text={block.text} />
        </p>
      )
    case 'code':
      return <pre className={styles.block}>{block.text}</pre>
    case 'quote':
      return (
        <blockquote>
          <Blocks blocks={block.blocks} definitions={definitions} />
        </blockquote>
      )
    case 'list': {
      const items = block.items.map((item, index) => (
        <Item definitions={definitions} item={item} key={index} />
      ))
      if (!block.ordered) return <ul>{items}</ul>
      return (
        <ol start={block.start === 1 ? undefined : block.start}>{items}</ol>
      )
    }
    case 'rule':
      return <hr />
    case 'table':
      return (
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                {block.head.map((cell, column) => (
                  <th
                    key={column}
                    style={{ textAlign: block.align[column] ?? undefined }}
                  >
                    <Inline definitions={definitions} text={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, column) => (
                    <td
                      key={column}
                      style={{ textAlign: block.align[column] ?? undefined }}
                    >
                      <Inline definitions={definitions} text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

function Blocks(props: {
  blocks: readonly MdBlock[]
  definitions: Definitions
}) {
  return props.blocks.map((block, index) => (
    <Block block={block} definitions={props.definitions} key={index} />
  ))
}

/**
 * A Markdown file, rendered as formatted text. It builds React elements
 * only: HTML in the file shows as text, and only http, https, and mailto
 * links work. A link opens in a new tab and sends no referrer.
 */
export function MarkdownView(props: { text: string }) {
  const document = useMemo(() => parseMarkdown(props.text), [props.text])
  return (
    <div className={styles.scroll}>
      <article className={styles.doc}>
        <Blocks blocks={document.blocks} definitions={document.definitions} />
      </article>
    </div>
  )
}
