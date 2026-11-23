import type { ToolCallItem, ToolKind } from '../../../fixtures/conversations'
import { changedFileSchema } from '../files/fileSchemas'
import { personKeys } from '../layout/railSchemas'
import { agentBlocksSchema, attachmentSchema } from './chatBlockSchemas'
import {
  lostReasons,
  lostWhats,
  macCommandStates,
  speedCauses,
  turnEndReasons,
} from './chatKeys'
import { capabilityChangedItemSchema } from './capabilityItemSchemas'
import { lateAnswerItemSchema, secretRunItemSchema } from './secretItemSchemas'
import { wakeItemSchema } from './wakeItemSchemas'

/** The kinds of a tool call, as `ToolKind` lists them. */
const toolKinds = [
  'read',
  'search',
  'create',
  'edit',
  'run',
] as const satisfies readonly ToolKind[]

/** The states of a tool call, as `ToolCallItem` lists them. */
const toolStatuses = [
  'done',
  'running',
  'stopped',
] as const satisfies readonly ToolCallItem['status'][]

/** A command that the agent asks to run on a Mac, as `MacCommandRequest`. */
export const macCommandRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['command', 'folder', 'reason', 'limit'],
  properties: {
    command: { type: 'string' },
    folder: { type: 'string' },
    reason: { type: 'string' },
    /** The time limit, such as `60 seconds`. */
    limit: { type: 'string' },
    /** Why the agent asks for more than the usual time limit. */
    longerBecause: { type: 'string' },
  },
} as const

/** A message of a member, with its attached files. */
const userItem = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'text'],
  properties: {
    kind: { const: 'user' },
    id: { type: 'string', minLength: 1 },
    text: { type: 'string' },
    attachments: { type: 'array', items: attachmentSchema },
    /** It waits in the queue until the sandbox is ready. */
    queued: { type: 'boolean' },
    /** Sent while a turn runs: it joins that turn as a new part. */
    during: { const: true },
  },
} as const

/** A message of the agent, as its blocks. */
export const agentItemSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'blocks'],
  properties: {
    kind: { const: 'agent' },
    id: { type: 'string', minLength: 1 },
    blocks: agentBlocksSchema,
  },
} as const

/** A tool call of an agent turn, as `ToolCallItem`. */
export const toolCallSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'tool', 'target', 'status'],
  properties: {
    kind: { const: 'tool' },
    id: { type: 'string', minLength: 1 },
    tool: { enum: toolKinds },
    target: { type: 'string' },
    detail: { type: 'string' },
    /** The size of output that the runner left out of `detail`. */
    omittedDetailBytes: { type: 'integer', minimum: 0 },
    status: { enum: toolStatuses },
  },
} as const

/** A command that the agent asks to run on the Mac of the sender. */
const macItem = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'request', 'state'],
  properties: {
    kind: { const: 'mac-command' },
    id: { type: 'string', minLength: 1 },
    request: macCommandRequestSchema,
    state: { enum: macCommandStates },
  },
} as const

/** A stopped turn, with who stopped it and the notes of the turn. */
const stoppedItem = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id'],
  properties: {
    kind: { const: 'stopped' },
    id: { type: 'string', minLength: 1 },
    /** The member who pressed Stop. A stop without Stop has none. */
    by: { enum: personKeys },
    /** The link of the session whose agent stopped the turn. */
    from: { type: 'string' },
    omittedFiles: { type: 'integer', minimum: 0 },
    filesUnavailable: { const: true },
    standardSpeed: { enum: speedCauses },
  },
} as const

/** A turn that failed, with the message of the error. */
const errorItem = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'text'],
  properties: {
    kind: { const: 'error' },
    id: { type: 'string', minLength: 1 },
    text: { type: 'string' },
    /** A failed turn before the newest turn: it shows no Try again. */
    older: { const: true },
  },
} as const

/** The line of a turn that runs, with its time so far. */
const workingItem = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'elapsed'],
  properties: {
    kind: { const: 'working' },
    id: { type: 'string', minLength: 1 },
    elapsed: { type: 'string' },
  },
} as const

/** The end of a finished turn: its time and its changed files. */
const turnEndItem = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'duration', 'files'],
  properties: {
    kind: { const: 'turn-end' },
    id: { type: 'string', minLength: 1 },
    duration: { type: 'string' },
    files: { type: 'array', items: changedFileSchema },
    omittedFiles: { type: 'integer', minimum: 0 },
    filesUnavailable: { const: true },
    endReason: { enum: turnEndReasons },
    standardSpeed: { enum: speedCauses },
  },
} as const

/** A runner event that the workspace refused. */
const lostItem = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'what', 'reason'],
  properties: {
    kind: { const: 'lost' },
    id: { type: 'string', minLength: 1 },
    what: { enum: lostWhats },
    reason: { enum: lostReasons },
  },
} as const

/** The first line of a linked session, with the title it came from. */
const linkedItem = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'from'],
  properties: {
    kind: { const: 'linked' },
    id: { type: 'string', minLength: 1 },
    from: { type: 'string' },
  },
} as const

/** The note of Continue: who pressed it, the new branch, and its base. */
const continuedItem = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'by', 'branch', 'base'],
  properties: {
    kind: { const: 'continued' },
    id: { type: 'string', minLength: 1 },
    by: { enum: personKeys },
    branch: { type: 'string' },
    base: { type: 'string' },
  },
} as const

/** The note of a repository change: who changed it, and the new branch. */
const repositoryChangedItem = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id', 'by', 'repository', 'branch'],
  properties: {
    kind: { const: 'repository-changed' },
    id: { type: 'string', minLength: 1 },
    by: { enum: personKeys },
    repository: { type: 'string' },
    branch: { type: 'string' },
  },
} as const

/** An item of a chat transcript as JSON, as `ChatItem`. */
export const chatItemSchema = {
  anyOf: [
    userItem,
    agentItemSchema,
    toolCallSchema,
    macItem,
    stoppedItem,
    errorItem,
    workingItem,
    turnEndItem,
    lostItem,
    linkedItem,
    continuedItem,
    repositoryChangedItem,
    capabilityChangedItemSchema,
    secretRunItemSchema,
    lateAnswerItemSchema,
    wakeItemSchema,
  ],
} as const

/** An item that the chat draws on its own, as `SingleItem`. */
export const singleItemSchema = {
  anyOf: [
    userItem,
    agentItemSchema,
    macItem,
    stoppedItem,
    errorItem,
    workingItem,
    turnEndItem,
    lostItem,
    linkedItem,
    continuedItem,
    repositoryChangedItem,
    capabilityChangedItemSchema,
    secretRunItemSchema,
    lateAnswerItemSchema,
    wakeItemSchema,
  ],
} as const

/** A step of the work of an ended turn, as `WorkItem`. */
export const workItemSchema = {
  anyOf: [
    agentItemSchema,
    toolCallSchema,
    macItem,
    secretRunItemSchema,
    lostItem,
  ],
} as const
