import { Fragment, type ReactNode } from 'react'
import type { MarkNode } from './markdownMarks'

/** The element of each mark: bold text, emphasis, and strikethrough. */
const markTags = { strong: 'strong', emphasis: 'em', strike: 'del' } as const

/**
 * Inline text after its marks pair, as React elements: `strong`, `em`, or
 * `del` around the text of each pair, and `br` for each line break. The
 * look of emphasis and strikethrough comes from `MarkdownProse.module.css`.
 * `unit` draws each unit, such as code or an image of the file preview.
 */
export function MarkedNodes<Unit>(props: {
  nodes: readonly MarkNode<Unit>[]
  unit: (unit: Unit) => ReactNode
}): ReactNode {
  return props.nodes.map((node, index) => {
    switch (node.kind) {
      case 'text':
        return <Fragment key={index}>{node.text}</Fragment>
      case 'break':
        return <br key={index} />
      case 'unit':
        return <Fragment key={index}>{props.unit(node.unit)}</Fragment>
      case 'mark': {
        const Tag = markTags[node.mark]
        return (
          <Tag key={index}>
            <MarkedNodes {...props} nodes={node.children} />
          </Tag>
        )
      }
    }
  })
}
