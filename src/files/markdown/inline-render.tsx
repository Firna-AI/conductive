import { Fragment, type ReactNode } from 'react'
import type { MdInline } from './markdown-inline'
import { textChunks } from './text-chunks'
import styles from './MarkdownView.module.css'

/**
 * Text as adjacent DOM text nodes: React makes one text node of each
 * string in a list. Short text stays one string.
 */
function text(value: string, key: number): ReactNode {
  const parts = textChunks(value)
  return parts.length === 1 ? value : <Fragment key={key}>{parts}</Fragment>
}

/** Parsed inline content as React elements. React escapes every text. */
export function inlineNodes(nodes: readonly MdInline[]): ReactNode[] {
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
