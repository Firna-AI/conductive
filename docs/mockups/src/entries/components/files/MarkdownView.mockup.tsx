import { defineComponent } from '@mokly/mokly'
import { MarkdownView } from '../../../components/files/MarkdownView'
import { readme } from '../../../fixtures/fileContents'

/** A heading or a paragraph of a Markdown file, as `MarkdownBlock`. */
const textBlock = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'text'],
  properties: {
    kind: { enum: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'code'] },
    text: { type: 'string' },
  },
} as const

/** A list of a Markdown file, numbered or not. */
const listBlock = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'items'],
  properties: {
    kind: { enum: ['ol', 'ul'] },
    items: { type: 'array', items: { type: 'string' } },
  },
} as const

/** A table of a Markdown file. */
const tableBlock = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'head', 'rows', 'align'],
  properties: {
    kind: { const: 'table' },
    head: { type: 'array', items: { type: 'string' } },
    rows: {
      type: 'array',
      items: { type: 'array', items: { type: 'string' } },
    },
    align: {
      type: 'array',
      items: { enum: ['left', 'center', 'right', null] },
    },
  },
} as const

/**
 * A Markdown file as formatted text, registered with Mokly. Its page shows
 * the README of the branch.
 */
export const markdownView = defineComponent({
  slug: 'markdown-view',
  title: 'Markdown view',
  description:
    'A Markdown file, rendered as formatted text: its headings, paragraphs, lists, code blocks, and tables, with inline code. Its own page shows the README of Storefront.',
  relatedDocs: ['docs/mockups/catalogue-attachments-and-files.md'],
  propSchema: {
    type: 'object',
    additionalProperties: false,
    required: ['blocks'],
    properties: {
      blocks: {
        type: 'array',
        items: { anyOf: [textBlock, listBlock, tableBlock] },
      },
    },
  } as const,
  props: { blocks: readme },
  render: (props) => <MarkdownView blocks={props.blocks} />,
})
