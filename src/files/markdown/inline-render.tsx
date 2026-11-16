import { Fragment, type ReactNode } from 'react'
import { TextLink } from '../../../docs/mockups/src/components/common/TextLink'
import type { WebLink } from '../../markdown/web-links'
import { useTextLinks } from '../../shell/ui/text-links'
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

/**
 * A link of the file, with the look of `TextLink`, through the link opener
 * of the screen. Its title gives its whole address. A link to a page of the
 * app opens that page in the app. Every other link opens a new tab, also an
 * address that chat text keeps as text: a `mailto` address, an address with
 * a user name or a password, and an address of the app that names no page.
 */
function FileLink(props: { href: string; children: ReactNode }) {
  // A local address of a file opens a new tab, as before the shared link
  // part. Chat text opens the preview of its port instead.
  const { linkOf, opener } = useTextLinks({ local: 'web' })
  if (!opener) return props.children
  const link: WebLink = linkOf(props.href) ?? {
    kind: 'web',
    url: new URL(props.href),
  }
  return (
    <TextLink address={link.url} opener={opener(link)}>
      {props.children}
    </TextLink>
  )
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
          <FileLink href={node.href} key={index}>
            {inlineNodes(node.children)}
          </FileLink>
        )
      case 'break':
        return <br key={index} />
    }
  })
}
