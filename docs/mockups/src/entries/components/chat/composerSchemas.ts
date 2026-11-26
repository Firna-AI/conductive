import type { MentionTree } from '../../../components/chat/FileMentionList'
import type { SkillSource } from '../../../components/chat/SkillMentionList'
import { agentKeys } from '../../../fixtures/agents'
import { agentChoiceSchema } from '../workspaces/workspaceSchemas'
import { attachmentSchema } from './chatBlockSchemas'

/** The file trees that the list of `@` finds, as `MentionTree` lists them. */
export const mentionTrees = [
  'latest',
  'limited',
  'loading',
  'unavailable',
] as const satisfies readonly MentionTree[]

/** The skills that the list of `/` finds, as `SkillSource` lists them. */
const skillSources = [
  'latest',
  'loading',
  'unavailable',
  'none',
] as const satisfies readonly SkillSource[]

/**
 * The agent login of a message when it is not the own login of the viewer:
 * the login of another member, or the org login, as `SessionLogin`.
 */
export const sessionLoginSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['owner'],
  properties: {
    /** The name of the owner of the login, such as `Cal` or `Acme`. */
    owner: { type: 'string' },
  },
} as const

/**
 * The Capabilities icon of a message box, as `CapabilitiesControl` without
 * its open control. A screen draws the open control, so a part takes it in
 * the `capabilitiesPanel` slot.
 */
export const capabilitiesSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    /** The screen with the control open, which a press on the icon opens. */
    to: { type: 'string', minLength: 1 },
    /** The control is open elsewhere, such as in a sheet on a phone. */
    expanded: { type: 'boolean' },
  },
} as const

/** The menu of the one button of a phone composer, as `ComposerMenuState`. */
const composerMenuSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['open'],
  properties: {
    open: { type: 'boolean' },
    /** The screen with the menu open, which a press on the button opens. */
    to: { type: 'string', minLength: 1 },
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
  /**
   * The favourites of the model menu, by default those of the viewer. With
   * none, the menu starts with All models.
   */
  favourites: { type: 'array', items: agentChoiceSchema },
  /** The submenu of All models of the open model menu is open. */
  allModels: { type: 'boolean' },
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
  /** The login of another member, or the org login, that a message spends. */
  sessionLogin: sessionLoginSchema,
  /** The list of `@` is open above the box, with this file tree. */
  mention: { enum: mentionTrees },
  /** The list of `/` is open above the box, with the skills so found. */
  skills: { enum: skillSources },
  /** The pointer over the icon of the first chip of the text. */
  pointer: { type: 'boolean' },
  /** The Capabilities icon beside the attach button. */
  capabilities: capabilitiesSchema,
  /** The menu of the one button of a phone, with Attach files. */
  menu: composerMenuSchema,
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
