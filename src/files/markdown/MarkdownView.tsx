import { memo, useEffect, useMemo, useState } from 'react'
import type { FilesError } from '../api/files-errors'
import { LoadingFile, ReadError } from '../ui/FileStates'
import { inlineNodes } from './inline-render'
import type { MdBlock, MdListItem } from './markdown-blocks'
import type { MarkdownDocument, MarkdownParser } from './markdown-document'
import type { MdInline } from './markdown-inline'
import { parseInWorker, type WorkerParse } from './worker-parse'
import styles from './MarkdownView.module.css'

type ParsedBlock = MdBlock<MdInline[]>

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

function Item(props: { item: MdListItem<MdInline[]> }) {
  const { item } = props
  const [first] = item.blocks
  const tight = item.blocks.length === 1 && first.kind === 'paragraph'
  return (
    <li className={item.checked === null ? undefined : styles.task}>
      {item.checked === null ? null : (
        <input checked={item.checked} disabled type="checkbox" />
      )}
      {tight ? <Inline nodes={first.text} /> : <Blocks blocks={item.blocks} />}
    </li>
  )
}

function Block(props: { block: ParsedBlock }) {
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
      return <pre className={styles.block}>{block.text}</pre>
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
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                {block.head.map((cell, column) => (
                  <th
                    key={column}
                    style={{ textAlign: block.align[column] ?? undefined }}
                  >
                    <Inline nodes={cell} />
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
                      <Inline nodes={cell} />
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

function Blocks(props: { blocks: readonly ParsedBlock[] }) {
  return props.blocks.map((block, index) => <Block block={block} key={index} />)
}

/**
 * One parsed document. A new render of the same document, as after Copy,
 * renders and splits the text of no block again.
 */
const Document = memo(function Document(props: { document: MarkdownDocument }) {
  return (
    <div className={styles.scroll}>
      <article className={styles.doc}>
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
 * Posts the text to a module worker, and shows the document of its reply.
 * A new text keeps the last document on screen until its own reply. When
 * the worker fails, Try again starts a new worker for the same text.
 */
function ParsedInWorker(props: { text: string }) {
  const { text } = props
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
  if (!current) return <LoadingFile />
  return (
    <ReadError
      error={parseFailed}
      onRetry={() => setAttempt(attempt + 1)}
      subject="file"
    />
  )
}

/**
 * A Markdown file, rendered as formatted text. It builds React elements
 * only: HTML in the file shows as text, and only http, https, and mailto
 * links work. A link opens in a new tab and sends no referrer. A module
 * worker parses the text, so a long or crafted file never blocks the page.
 * `parser` parses on the calling thread instead, for a static render.
 */
export function MarkdownView(props: { text: string; parser?: MarkdownParser }) {
  return props.parser ? (
    <ParsedNow parser={props.parser} text={props.text} />
  ) : (
    <ParsedInWorker text={props.text} />
  )
}
