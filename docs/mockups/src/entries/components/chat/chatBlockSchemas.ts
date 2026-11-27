import type { CellAlign } from '../../../../../../src/markdown/table-rows'
import type { Attachment } from '../../../fixtures/attachments'

/** The alignments of a column of a table, as `CellAlign` lists them. */
const cellAligns = [
  'left',
  'center',
  'right',
  null,
] as const satisfies readonly CellAlign[]

const string = { type: 'string' } as const

/**
 * Mokly schemas cannot reference themselves. The child arrays hold the
 * same typed trees as the top level.
 */
const children = { type: 'array' } as const

function node<
  const Kind extends string,
  const Fields extends Record<string, unknown>,
  const Required extends readonly Extract<keyof Fields, string>[],
>(kind: Kind, required: Required, fields: Fields) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['kind', ...required],
    properties: { kind: { const: kind }, ...fields },
  } as const
}

/** Inline text of a paragraph, heading, or table cell. */
export const inlineTextSchema = {
  type: 'array',
  items: {
    anyOf: [
      node('text', ['text'], { text: string }),
      node('code', ['text'], { text: string }),
      node('break', [], {}),
      node('mark', ['mark', 'nodes'], {
        mark: { enum: ['strong', 'emphasis', 'strike'] },
        nodes: children,
      }),
      node('link', ['href', 'label', 'typed'], {
        href: string,
        label: children,
        typed: {
          type: 'object',
          additionalProperties: false,
          required: ['open', 'close'],
          properties: { open: string, close: string },
        },
      }),
      node('image', ['href', 'alt', 'source'], {
        href: string,
        alt: children,
        source: string,
      }),
    ],
  },
} as const

const listItems = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['checked', 'blocks'],
    properties: { checked: { enum: [true, false, null] }, blocks: children },
  },
} as const

/** The blocks of an agent message, as the shared renderer reads them. */
export const agentBlocksSchema = {
  type: 'array',
  items: {
    anyOf: [
      node('p', ['text'], { text: inlineTextSchema }),
      node('heading', ['level', 'text'], {
        level: { enum: [1, 2, 3, 4, 5, 6] },
        text: inlineTextSchema,
      }),
      node('ul', ['items'], { items: listItems }),
      node('ol', ['start', 'items'], {
        start: { type: 'integer' },
        items: listItems,
      }),
      node('code', ['text'], {
        text: string,
        label: { type: ['string', 'null'] },
      }),
      node('quote', ['blocks'], { blocks: children }),
      node('rule', [], {}),
      node('table', ['head', 'rows', 'align'], {
        head: { type: 'array', items: inlineTextSchema },
        rows: {
          type: 'array',
          items: { type: 'array', items: inlineTextSchema },
        },
        align: { type: 'array', items: { enum: cellAligns } },
      }),
    ],
  },
} as const

/** The kinds of an attached file, as `Attachment` lists them. */
const attachmentKinds = [
  'image',
  'file',
] as const satisfies readonly Attachment['kind'][]

/** The upload states of an attached file, as `Attachment` lists them. */
const uploadStates = [
  'uploading',
  'failed',
] as const satisfies readonly NonNullable<Attachment['state']>[]

/** An attached file of a message as JSON, with the fields of `Attachment`. */
export const attachmentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'name', 'kind', 'sizeBytes', 'path'],
  properties: {
    /** The draft ID of the file, which its mark in the draft text holds. */
    id: { type: 'string', minLength: 1 },
    name: { type: 'string' },
    kind: { enum: attachmentKinds },
    sizeBytes: { type: 'integer', minimum: 0 },
    /** The copy path that the upload gives. */
    path: { type: 'string' },
    /** The file tab that a press on its sent chip shows, when drawn. */
    tab: { const: 'picture' },
    /** The upload still runs, or it failed. An uploaded file has none. */
    state: { enum: uploadStates },
    /** The bytes of an upload that the browser measured as sent. */
    sentBytes: { type: 'integer', minimum: 0 },
  },
} as const
