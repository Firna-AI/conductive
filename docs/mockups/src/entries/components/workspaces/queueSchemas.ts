import type { QueueUnit } from '../../../components/workspaces/queue'
import type { RepositoryKey } from '../../../fixtures/repositories'
import { rowControlsSchema } from './rowSchemas'
import { workspaceRowSchema } from './workspaceSchemas'

/** The parts of a member stack, as `QueueUnit` lists them. */
const queueUnits = [
  'first',
  'middle',
  'last',
] as const satisfies readonly QueueUnit[]

/** The repositories of Acme, as `RepositoryKey` lists them. */
const repositoryKeys = [
  'storefront',
  'billing-service',
  'marketing-site',
] as const satisfies readonly RepositoryKey[]

/** One entry of a queue as JSON, as `QueueEntry`. */
const queueEntrySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['row'],
  properties: {
    /** The normal row of its workspace. */
    row: workspaceRowSchema,
    unit: { enum: queueUnits },
  },
} as const

/** The Merge queue group as JSON, as `MergeQueueList`. */
export const mergeQueueSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['blocks'],
  properties: {
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['repository', 'name', 'entries'],
        properties: {
          repository: { enum: repositoryKeys },
          name: { type: 'string' },
          entries: { type: 'array', items: queueEntrySchema },
        },
      },
    },
    collapsed: { type: 'boolean' },
  },
} as const

/** A place in a block, counted from 0. */
const indexSchema = { type: 'integer', minimum: 0 } as const

/** The move of an entry in its block, as both drags give it. */
const reorderSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'workspace', 'index'],
  properties: {
    kind: { const: 'reorder' },
    workspace: { type: 'string' },
    index: indexSchema,
  },
} as const

/** A drag that the group draws, as `QueueDrag`. */
export const queueDragSchema = {
  anyOf: [
    reorderSchema,
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'workspace'],
      properties: { kind: { const: 'add' }, workspace: { type: 'string' } },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'workspace', 'reason'],
      properties: {
        kind: { const: 'refused' },
        workspace: { type: 'string' },
        /** Why the row cannot join, in words. */
        reason: { type: 'string' },
      },
    },
  ],
} as const

/** The drop that the group draws, as `GroupDrop`. */
export const groupDropSchema = {
  anyOf: [
    reorderSchema,
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'row'],
      properties: { kind: { const: 'add' }, row: workspaceRowSchema },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'row', 'reason'],
      properties: {
        kind: { const: 'refused' },
        row: workspaceRowSchema,
        /** Why the row cannot join, in words. */
        reason: { type: 'string' },
      },
    },
  ],
} as const

/** The one row whose menu or hover the view draws, as `DrawnRow`. */
export const drawnRowSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workspace', 'controls'],
  properties: {
    workspace: { type: 'string' },
    controls: rowControlsSchema,
  },
} as const
