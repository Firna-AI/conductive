import type { ChipFile } from '../../../../../../src/ui/components/chat/attachedFileParts'
import type { MentionEntry } from '../../../../../../src/ui/components/chat/mentionEntry'
import { activityStatuses, githubSchema } from '../workspaces/workspaceSchemas'

/**
 * How a chip of a message box can go, as `ChipRemoval` without its
 * callback: the name in "Remove <name>", and the pointer over its icon.
 */
export const removalSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name'],
  properties: {
    name: { type: 'string' },
    /** The pointer over the icon of the chip, as a view cannot hover. */
    pointer: { type: 'boolean' },
  },
} as const

/** What the chip of a workspace shows, as `ChipWorkspace`. */
export const chipWorkspaceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'name', 'status', 'github'],
  properties: {
    /** The label of the number of the workspace, such as `W-395`. */
    label: { type: 'string' },
    /** The link name, or the title of a session chip. */
    name: { type: 'string' },
    status: { enum: activityStatuses },
    github: githubSchema,
    /** Whether a message waits for the cloud computer to start. */
    messageWaiting: { type: 'boolean' },
  },
} as const

/** What a session chip shows, as `ChipSession`. */
export const chipSessionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['workspace', 'title'],
  properties: {
    /** The label, the state, and the GitHub state of its workspace. */
    workspace: {
      type: 'object',
      additionalProperties: false,
      required: ['label', 'status', 'github'],
      properties: {
        label: { type: 'string' },
        status: { enum: activityStatuses },
        github: githubSchema,
        messageWaiting: { type: 'boolean' },
      },
    },
    /** The title of the session, or Untitled. */
    title: { type: 'string' },
  },
} as const

/** The kinds of an attached file, as `ChipFile` lists them. */
const chipKinds = [
  'image',
  'file',
] as const satisfies readonly ChipFile['kind'][]

/** What a chip shows of an attached file, as `ChipFile`. */
export const chipFileSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'kind', 'sizeBytes'],
  properties: {
    name: { type: 'string' },
    kind: { enum: chipKinds },
    sizeBytes: { type: 'integer', minimum: 0 },
  },
} as const

/** The tabs that a press on the chip of a file opens, as `MentionEntry`. */
const mentionPreviews = [
  'code',
  'markdown',
] as const satisfies readonly NonNullable<MentionEntry['preview']>[]

/** A file or a folder of the tree, as `MentionEntry`. */
export const mentionEntrySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'folder'],
  properties: {
    path: { type: 'string', minLength: 1 },
    folder: { type: 'boolean' },
    /** The tab that a press on the chip of the file shows, when drawn. */
    preview: { enum: mentionPreviews },
  },
} as const
