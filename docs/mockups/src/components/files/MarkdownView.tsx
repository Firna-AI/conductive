import type { MarkdownBlock } from '../../fixtures/fileContents'
import { classes } from '../common/classes'
import headingStyles from '../common/MarkdownHeadings.module.css'
import prose from '../common/MarkdownProse.module.css'
import { MarkdownTable } from '../common/MarkdownTable'
import { taskText } from '../common/markdownTasks'
import { TaskBox } from '../common/TaskBox'
import { PreviewText } from './PreviewText'
import styles from './MarkdownView.module.css'

/** A cell of a table, with its inline code, its marks, and its breaks. */
function fileCell(text: string) {
  return <PreviewText text={text} />
}

/**
 * An item of a list. A task item shows its fixed check box in the place of
 * its bullet, as the chat does (item 14 B).
 */
function listItem(item: string) {
  const { text, checked } = taskText(item)
  return (
    <li className={checked === null ? undefined : prose.task} key={item}>
      {checked === null ? null : <TaskBox checked={checked} />}
      <PreviewText text={text} />
    </li>
  )
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
          <PreviewText text={block.text} />
        </Heading>
      )
    }
    case 'p':
      return (
        <p>
          <PreviewText text={block.text} />
        </p>
      )
    case 'ol':
    case 'ul': {
      const List = block.kind
      return <List>{block.items.map(listItem)}</List>
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
    case 'quote':
      return (
        <blockquote>
          {block.blocks.map((inner, index) => (
            <Block block={inner} key={index} />
          ))}
        </blockquote>
      )
    case 'rule':
      return <hr />
  }
}

/**
 * A Markdown file, rendered as formatted text. The headings take the look
 * of MarkdownHeadings.module.css, and the quotes, the rules, the bold text,
 * the emphasis, the strikethrough, and the task boxes the look of
 * MarkdownProse.module.css, which the replies of the chat share.
 */
export function MarkdownView(props: { blocks: readonly MarkdownBlock[] }) {
  return (
    <div className={styles.scroll} data-mokly-scroll="file-preview">
      <article
        className={classes(styles.doc, headingStyles.headings, prose.prose)}
      >
        {props.blocks.map((block, index) => (
          <Block block={block} key={index} />
        ))}
      </article>
    </div>
  )
}
