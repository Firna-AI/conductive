import type { MarkdownBlock } from '../../fixtures/fileContents'
import { InlineText } from '../common/InlineText'
import { MarkdownTable } from '../common/MarkdownTable'
import styles from './MarkdownView.module.css'

/** A cell of a table, with its inline code. */
function fileCell(text: string) {
  return <InlineText text={text} />
}

function Block(props: { block: MarkdownBlock }) {
  const { block } = props
  switch (block.kind) {
    case 'h1':
      return <h1>{block.text}</h1>
    case 'h2':
      return <h2>{block.text}</h2>
    case 'p':
      return (
        <p>
          <InlineText text={block.text} />
        </p>
      )
    case 'ol':
    case 'ul': {
      const List = block.kind
      return (
        <List>
          {block.items.map((item) => (
            <li key={item}>
              <InlineText text={item} />
            </li>
          ))}
        </List>
      )
    }
    case 'code':
      return <pre className={styles.block}>{block.text}</pre>
    case 'table':
      return (
        <MarkdownTable
          align={block.align}
          className={styles.table}
          head={block.head}
          renderCell={fileCell}
          rows={block.rows}
        />
      )
  }
}

/** A Markdown file, rendered as formatted text. */
export function MarkdownView(props: { blocks: readonly MarkdownBlock[] }) {
  return (
    <div className={styles.scroll} data-mokly-scroll="file-preview">
      <article className={styles.doc}>
        {props.blocks.map((block, index) => (
          <Block block={block} key={index} />
        ))}
      </article>
    </div>
  )
}
