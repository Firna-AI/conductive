import type { MarkdownBlock } from '../../fixtures/fileContents'
import { FenceText } from '../../../../../src/files/code/CodeText'
import { classes } from '../../../../../src/ui/components/common/classes'
import headingStyles from '../../../../../src/ui/components/common/MarkdownHeadings.module.css'
import prose from '../../../../../src/ui/components/common/MarkdownProse.module.css'
import { markdownTable } from '../../entries/components/common/MarkdownTable.mockup'
import { taskText } from '../common/markdownTasks'
import { TaskBox } from '../../../../../src/ui/components/common/TaskBox'
import { PreviewText } from './PreviewText'
import styles from '../../../../../src/ui/components/files/MarkdownView.module.css'

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

/**
 * One block of a Markdown file. The blocks of a file have no key that stays
 * when they move, so their text stays plain: the name of a Mokly instance
 * must stay the same when the blocks move. A file shows one table, also in
 * its quotes, which keeps the default name of the registered table.
 */
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
      return (
        <pre className={styles.block}>
          <FenceText label={block.label ?? null} text={block.text} />
        </pre>
      )
    case 'table':
      return (
        <markdownTable.Component
          align={block.align}
          className={styles.table}
          head={block.head}
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
 * MarkdownProse.module.css, which the replies of the chat share. A code
 * block with the label of a known language shows the colours of a file tab
 * of that language, as a code block of a reply does.
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
