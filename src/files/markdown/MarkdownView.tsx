import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import { classes } from '../../ui/components/common/classes'
import headingStyles from '../../ui/components/common/MarkdownHeadings.module.css'
import prose from '../../ui/components/common/MarkdownProse.module.css'
import { MarkdownTable } from '../../ui/components/common/MarkdownTable'
import { MarkdownItem } from '../../markdown/MarkdownItem'
import type { FilesError } from '../api/files-errors'
import { CodeText } from '../code/CodeText'
import { LoadingFile, ReadError } from '../ui/FileStates'
import { inlineNodes } from './inline-render'
import type {
  MarkdownDocument,
  MarkdownParser,
  MdBlock,
  MdInline,
  MdListItem,
} from './markdown-document'
import { textChunks } from './text-chunks'
import { useKeptScroll } from '../ui/kept-scroll'
import { parseInWorker, type WorkerParse } from './worker-parse'
import styles from './MarkdownView.module.css'

/** The parse failed, so the preview offers Try again, as a failed read does. */
const parseFailed: Extract<FilesError, { kind: 'failed' }> = {
  kind: 'failed',
  status: null,
  code: null,
}

const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

function Inline(props: { nodes: readonly MdInline[] }) {
  return <>{inlineNodes(props.nodes)}</>
}

/** A cell of a table, with its parsed inline content. */
function tableCell(nodes: readonly MdInline[]) {
  return <Inline nodes={nodes} />
}

/** The text of a paragraph of a list item, or null for another block. */
function itemText(block: MdBlock) {
  return block.kind === 'paragraph' ? <Inline nodes={block.text} /> : null
}

/** The blocks of a list item after its text. */
function itemBlocks(blocks: readonly MdBlock[]) {
  return <Blocks blocks={blocks} />
}

/** An item of a list, with its task box, as `MarkdownItem` draws it. */
function Item(props: { item: MdListItem }) {
  return <MarkdownItem blocks={itemBlocks} item={props.item} text={itemText} />
}

function Block(props: { block: MdBlock }) {
  const { block } = props
  switch (block.kind) {
    case 'heading': {
      const Heading = headingTags[block.level - 1]
      return (
        <Heading>
          <Inline nodes={block.text} />
        </Heading>
      )
    }
    case 'paragraph':
      return (
        <p>
          <Inline nodes={block.text} />
        </p>
      )
    case 'code':
      // The parse, which the worker runs, coloured the lines, so the view
      // only draws them.
      return (
        <pre className={styles.block}>
          <CodeText lines={block.lines} text={block.text} />
        </pre>
      )
    case 'literal':
      // Text as typed, with its line breaks, and no Markdown inside.
      return <p className={styles.literal}>{textChunks(block.text)}</p>
    case 'quote':
      return (
        <blockquote>
          <Blocks blocks={block.blocks} />
        </blockquote>
      )
    case 'list': {
      const items = block.items.map((item, index) => (
        <Item item={item} key={index} />
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
        <MarkdownTable
          align={block.align}
          className={styles.table}
          head={block.head}
          renderCell={tableCell}
          rows={block.rows}
        />
      )
  }
}

function Blocks(props: { blocks: readonly MdBlock[] }) {
  return props.blocks.map((block, index) => <Block block={block} key={index} />)
}

/**
 * One parsed document. A new render of the same document, as after Copy,
 * renders and splits the text of no block again. The headings, the quotes,
 * the rules, the bold text, the emphasis, the strikethrough, and the task
 * boxes take the styles that the chat shares, with the margins of the
 * preview. A file tab keeps its scroll offset.
 */
const Document = memo(function Document(props: { document: MarkdownDocument }) {
  const box = useKeptScroll('preview')
  return (
    <div className={styles.scroll} ref={box}>
      <article
        className={classes(styles.doc, headingStyles.headings, prose.prose)}
      >
        <Blocks blocks={props.document.blocks} />
      </article>
    </div>
  )
})

function ParsedNow(props: { text: string; parser: MarkdownParser }) {
  const { parser, text } = props
  const document = useMemo(() => parser(text), [parser, text])
  return <Document document={document} />
}

/** The last reply of the worker, with the text and the attempt that it parsed. */
interface Outcome {
  text: string
  attempt: number
  parse: WorkerParse
}

/**
 * What a preview shows while the worker parses its text, and after the
 * worker failed, with the Try again that `failed` gets. Without them, the
 * preview shows the words of a file.
 */
export interface PreviewStates {
  loading: ReactNode
  failed: (onRetry: () => void) => ReactNode
}

/**
 * Posts the text to a module worker, and shows the document of its reply.
 * A new text keeps the last document on screen until its own reply. When
 * the worker fails, Try again starts a new worker for the same text.
 */
function ParsedInWorker(props: { text: string; states?: PreviewStates }) {
  const { text, states } = props
  const [attempt, setAttempt] = useState(0)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  useEffect(
    () => parseInWorker(text, (parse) => setOutcome({ text, attempt, parse })),
    [text, attempt],
  )
  if (outcome?.parse.status === 'parsed') {
    return <Document document={outcome.parse.document} />
  }
  const current = outcome?.text === text && outcome.attempt === attempt
  if (!current) return states?.loading ?? <LoadingFile />
  const retry = () => setAttempt(attempt + 1)
  return states ? (
    states.failed(retry)
  ) : (
    <ReadError error={parseFailed} onRetry={retry} subject="file" />
  )
}

/**
 * A Markdown file, rendered as formatted text. It builds React elements
 * only: HTML in the file shows as text, apart from a line-break tag, and
 * only http, https, and mailto links work. Each link opens through the link opener of the screen: a
 * link to a page of the app opens in the app, and every other link opens a
 * new tab that gets no referrer. A module worker parses the text, so a long
 * or crafted file never blocks the page. `parser` parses on the calling
 * thread instead, for a static render. `states` gives the parse and its
 * failure the words of a page that shows no file, such as a skill tab.
 */
export function MarkdownView(props: {
  text: string
  parser?: MarkdownParser
  states?: PreviewStates
}) {
  return props.parser ? (
    <ParsedNow parser={props.parser} text={props.text} />
  ) : (
    <ParsedInWorker states={props.states} text={props.text} />
  )
}
