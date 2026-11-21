import type { FeedbackProblem } from '../../../components/feedback/FeedbackDialog'

/** A screenshot of the draft, as `FeedbackScreenshot`: its name and size. */
const screenshotSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'sizeBytes'],
  properties: {
    name: { type: 'string' },
    sizeBytes: { type: 'integer', minimum: 0 },
  },
} as const

/** The screenshots of the draft, in order. */
export const screenshotsSchema = {
  type: 'array',
  items: screenshotSchema,
} as const

/**
 * The read of the reply address, as `FeedbackReply`: it runs, it failed, or
 * it is ready, with the primary verified email of the GitHub account or
 * none.
 */
export const replySchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['state'],
      properties: { state: { const: 'loading' } },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['state'],
      properties: { state: { const: 'failed' } },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['state', 'email'],
      properties: {
        state: { const: 'ready' },
        email: { anyOf: [{ type: 'string' }, { const: null }] },
      },
    },
  ],
} as const

/** The files that a notice names, as the kinds of `FeedbackProblem`. */
const refusedKinds = [
  'too-large',
  'other-type',
] as const satisfies readonly FeedbackProblem['kind'][]

/**
 * What a notice under the message box names, as `FeedbackProblem`: a file
 * that the dialog did not add, or a send that failed.
 */
export const problemSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'name'],
      properties: { kind: { enum: refusedKinds }, name: { type: 'string' } },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'message'],
      properties: {
        kind: { const: 'not-sent' },
        message: { type: 'string' },
      },
    },
  ],
} as const
