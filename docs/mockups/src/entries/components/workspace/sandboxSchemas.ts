import type { ArchiveRestore } from '../../../components/workspace/sandboxNoticeState'

/** What an archived workspace can get back, as `ArchiveRestore`. */
const archiveRestores = [
  'available',
  'refused',
  'ended',
] as const satisfies readonly ArchiveRestore[]

/** The days of an archived workspace, as `ArchiveDays`. */
const archiveDaysSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['archivedOn', 'removedOn'],
  properties: {
    /** The day of the Archive. */
    archivedOn: { type: 'string' },
    /** The last day of Restore, when the workspace leaves the list. */
    removedOn: { type: 'string' },
  },
} as const

/**
 * The states of a sandbox that is not running, as `BarNotice`: the states
 * of `SandboxNoticeState`, with the days of an archived workspace.
 */
const noticeStates = [
  {
    type: 'object',
    additionalProperties: false,
    required: ['problem'],
    properties: { problem: { const: 'stopped' } },
  },
  {
    type: 'object',
    additionalProperties: false,
    required: ['problem', 'days'],
    properties: {
      problem: { const: 'archived' },
      /** Without it, the cloud computer is gone, and nothing comes back. */
      restore: { enum: archiveRestores },
      /** Its 14 days ended, so it left the list. */
      removed: { type: 'boolean' },
      /** The day of the Archive, and the day when it leaves the list. */
      days: archiveDaysSchema,
    },
  },
  {
    type: 'object',
    additionalProperties: false,
    required: ['problem'],
    properties: {
      problem: { const: 'error' },
      /** The message that the app saved for the start that failed. */
      message: { type: ['string', 'null'] },
      /** The failed first start of a new workspace. */
      firstStart: { type: 'boolean' },
    },
  },
  {
    type: 'object',
    additionalProperties: false,
    required: ['problem', 'reason'],
    properties: {
      problem: { const: 'refused' },
      /** The words of the app's refusal. */
      reason: { type: 'string' },
    },
  },
] as const

/** The bar of a sandbox that is not running, as `BarNotice`. */
export const sandboxNoticeSchema = { anyOf: noticeStates } as const

/** What a panel shows in place of its content, as `PanelNotice`. */
export const sandboxPanelSchema = {
  anyOf: [
    ...noticeStates,
    {
      type: 'object',
      additionalProperties: false,
      required: ['problem'],
      properties: { problem: { const: 'starting' } },
    },
  ],
} as const

/** The steps of a sandbox start, as `StartingLog`. */
export const startingLogSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'steps', 'elapsed'],
  properties: {
    title: { type: 'string' },
    steps: { type: 'array', items: { type: 'string' } },
    /** The time since the start, such as `0:42`. */
    elapsed: { type: 'string' },
  },
} as const
