import type { CellAlign } from '../../../../../../src/markdown/table-rows'
import type { Attachment } from '../../../fixtures/attachments'

/** The alignments of a column of a table, as `CellAlign` lists them. */
const cellAligns = [
  'left',
  'center',
  'right',
  null,
] as const satisfies readonly CellAlign[]

/** A heading of a message, as `MessageHeading`. */
const headingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'level', 'text'],
  properties: {
    kind: { const: 'heading' },
    level: { enum: [1, 2, 3, 4, 5, 6] },
    text: { type: 'string' },
  },
} as const

/** A table of a message, as `MessageTable`: a short row keeps its cells. */
const tableSchema = {
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
    align: { type: 'array', items: { enum: cellAligns } },
  },
} as const

/** A list of a message whose items take the schema `item`. */
function listOf<const Item>(item: Item) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'numbered', 'items'],
    properties: {
      kind: { const: 'list' },
      numbered: { type: 'boolean' },
      items: { type: 'array', items: item },
    },
  } as const
}

/** An item of a list with the list under it, whose schema is `list`. */
function itemWith<const List>(list: List) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['text'],
    properties: { text: { type: 'string' }, list },
  } as const
}

/** An item of the deepest list, without a list under it. */
const leafItem = {
  type: 'object',
  additionalProperties: false,
  required: ['text'],
  properties: { text: { type: 'string' } },
} as const

/**
 * A list of a message, as `MessageList`, with the lists that the agent
 * indents under its items. A schema has no reference to itself, so it
 * takes lists three levels deep. The replies of the mockups go two deep.
 */
const listSchema = listOf(itemWith(listOf(itemWith(listOf(leafItem)))))

/** A code block of a message, as `MessageCodeBlock`: its text as written. */
const codeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'text'],
  properties: {
    kind: { const: 'code' },
    text: { type: 'string' },
  },
} as const

/** A rule of a message, as `MessageRule`: a line between two of its parts. */
const ruleSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind'],
  properties: { kind: { const: 'rule' } },
} as const

/** The blocks of a message that hold no other block. */
const flatBlocks = [
  { type: 'string' },
  headingSchema,
  tableSchema,
  listSchema,
  codeSchema,
  ruleSchema,
] as const

/** A quote of a message whose blocks take the schema `block`. */
function quoteOf<const Block>(block: Block) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['kind', 'blocks'],
    properties: {
      kind: { const: 'quote' },
      blocks: { type: 'array', items: block },
    },
  } as const
}

/**
 * A quote of a message, as `MessageQuote`, with the blocks that it holds. A
 * schema has no reference to itself, so it takes quotes two levels deep.
 * The replies of the mockups quote one level.
 */
const quoteSchema = quoteOf({
  anyOf: [...flatBlocks, quoteOf({ anyOf: flatBlocks })],
})

/**
 * A block of a message of the agent, as `AgentBlock`: a paragraph, a
 * heading, a table, a list, a code block, a quote, or a rule.
 */
export const agentBlockSchema = {
  anyOf: [...flatBlocks, quoteSchema],
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
