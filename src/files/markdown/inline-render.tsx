import { Fragment, type ReactNode } from 'react'
import { parseInline, type MdInline } from './markdown-inline'
import { textChunks } from './text-chunks'
import styles from './MarkdownView.module.css'

type Definitions = ReadonlyMap<string, string>

/**
 * Text as adjacent DOM text nodes: React makes one text node of each
 * string in a list. Short text stays one string.
 */
function text(value: string, key: number): ReactNode {
  const parts = textChunks(value)
  return parts.length === 1 ? value : <Fragment key={key}>{parts}</Fragment>
}

/** Inline content as React elements. React escapes every text. */
function inlineNodes(nodes: readonly MdInline[]): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.kind) {
      case 'text':
        return text(node.text, index)
      case 'code':
        return (
          <code className={styles.code} key={index}>
            {text(node.text, 0)}
          </code>
        )
      case 'strong':
        return <strong key={index}>{inlineNodes(node.children)}</strong>
      case 'emphasis':
        return <em key={index}>{inlineNodes(node.children)}</em>
      case 'strike':
        return <del key={index}>{inlineNodes(node.children)}</del>
      case 'link':
        return (
          <a
            href={node.href}
            key={index}
            rel="noopener noreferrer"
            target="_blank"
          >
            {inlineNodes(node.children)}
          </a>
        )
      case 'break':
        return <br key={index} />
    }
  })
}

/**
 * The rendered inline content of each block text, for each document. The
 * key is the definitions map of the document, so the cache lives as long as
 * the document that the view keeps, and holds no file text after it.
 */
const rendered = new WeakMap<Definitions, Map<string, readonly ReactNode[]>>()

/**
 * The React nodes of one block's inline content. A new render of the same
 * document, as after Copy, parses and splits the text again for no block.
 */
export function inlineElements(
  value: string,
  definitions: Definitions,
): readonly ReactNode[] {
  let texts = rendered.get(definitions)
  if (!texts) {
    texts = new Map()
    rendered.set(definitions, texts)
  }
  let elements = texts.get(value)
  if (!elements) {
    elements = inlineNodes(parseInline(value, definitions))
    texts.set(value, elements)
  }
  return elements
}
