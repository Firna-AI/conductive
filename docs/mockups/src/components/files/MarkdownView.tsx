import type { MarkdownBlock } from '../../fixtures/fileContents'
import { classes } from '../common/classes'
import inline from '../common/InlineText.module.css'
import headingStyles from '../common/MarkdownHeadings.module.css'
import { MarkdownTable } from '../common/MarkdownTable'
import { Found } from '../find/findMarks'
import styles from './MarkdownView.module.css'

/**
 * Text with each part in backticks as inline code, as `InlineText` draws
 * it. An open find bar colours its matches in the text and in the code.
 */
function MarkdownText(props: { text: string }) {
  return props.text.split('`').map((part, index) =>
    index % 2 === 1 ? (
      <code className={inline.code} key={index}>
        <Found text={part} />
      </code>
    ) : (
      <Found key={index} text={part} />
    ),
  )
}

/** A cell of a table, with its inline code. */
function fileCell(text: string) {
  return <MarkdownText text={text} />
}

function Block(props: { block: MarkdownBlock }) {
  const { block } = props
  switch (block.kind) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const Heading = block.kind
      return (
        <Heading>
          <MarkdownText text={block.text} />
        </Heading>
      )
    }
    case 'p':
      return (
        <p>
          <MarkdownText text={block.text} />
        </p>
      )
    case 'ol':
    case 'ul': {
      const List = block.kind
      return (
        <List>
          {block.items.map((item) => (
            <li key={item}>
              <MarkdownText text={item} />
            </li>
          ))}
        </List>
      )
    }
    case 'code':
      return (
        <pre className={styles.block}>
          <Found text={block.text} />
        </pre>
      )
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
      <article className={classes(styles.doc, headingStyles.headings)}>
        {props.blocks.map((block, index) => (
          <Block block={block} key={index} />
        ))}
      </article>
    </div>
  )
}
