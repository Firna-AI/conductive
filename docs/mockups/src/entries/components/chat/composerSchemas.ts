import type { MentionTree } from '../../../components/chat/FileMentionList'
import { agentKeys } from '../../../fixtures/agents'
import { agentChoiceSchema } from '../workspaces/workspaceSchemas'
import { attachmentSchema } from './chatBlockSchemas'

/** The file trees that the list of `@` finds, as `MentionTree` lists them. */
export const mentionTrees = [
  'latest',
  'loading',
  'unavailable',
] as const satisfies readonly MentionTree[]

/** The agent login of another member that a session uses. */
const sessionLoginSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['starter'],
  properties: {
    /** The name of the starter, such as `Cal`. */
    starter: { type: 'string' },
  },
} as const

/** The state of a message box, with the fields of `ComposerState`. */
export const composerStateProperties = {
  /** The model and the effort of the next message. */
  choice: agentChoiceSchema,
  /** An agent turn runs, so a message steers it, and Stop ends it. */
  running: { type: 'boolean' },
  /** A message starts a new linked session, so it does not steer. */
  startsSession: { type: 'boolean' },
  /** The text of the message, with a mark for each attached file. */
  draft: { type: 'string' },
  /** The attached files, whose chips stand in the text. */
  attachments: { type: 'array', items: attachmentSchema },
  /** Files hover over the box, so it shows the drop state. */
  drop: { type: 'boolean' },
  /** The caret at this index of the draft, as a view runs no script. */
  caret: { type: 'integer', minimum: 0 },
  /** The screen that the attach button leads to. */
  attachTo: { type: 'string', minLength: 1 },
  /** The model picker is open. */
  picker: { type: 'boolean' },
  /** The agent of the session, once it has messages. */
  sessionAgent: { enum: agentKeys },
  /** The picker of a session tab, whose Fast row shows its key. */
  fastKey: { type: 'boolean' },
  /** The models that the picker leaves out. */
  hiddenModels: { type: 'array', items: { type: 'string' } },
  /** The text of an empty box. */
  placeholder: { type: 'string' },
  /** The screen that Send leads to. */
  sendTo: { type: 'string', minLength: 1 },
  /** The agent of the chosen model is not connected, so Send is off. */
  blocked: { type: 'boolean' },
  /** The login of the starter that a message spends. */
  sessionLogin: sessionLoginSchema,
  /** The list of `@` is open above the box, with this file tree. */
  mention: { enum: mentionTrees },
  /** The pointer over the icon of the first chip of the text. */
  pointer: { type: 'boolean' },
} as const

/** The required fields of the state of a message box. */
export const composerRequired = [
  'choice',
  'running',
  'draft',
  'attachments',
] as const

/** The state of a message box as JSON, as `ComposerState`. */
export const composerStateSchema = {
  type: 'object',
  additionalProperties: false,
  required: composerRequired,
  properties: composerStateProperties,
} as const
