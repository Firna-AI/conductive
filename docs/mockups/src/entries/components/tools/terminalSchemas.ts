import type { TerminalTone } from '../../../fixtures/terminal'
import type { SharedSize } from '../../../fixtures/terminals'

/** The colours of the text of a terminal, as `TerminalTone` lists them. */
const terminalTones = [
  'prompt',
  'plain',
  'muted',
  'success',
  'accent',
  'error',
] as const satisfies readonly TerminalTone[]

/** The shared size against the panel, as `SharedSize` lists them. */
export const sharedSizes = [
  'larger',
  'smaller',
] as const satisfies readonly SharedSize[]

/** A line of a terminal as JSON, as `TerminalLine`: its coloured parts. */
export const terminalLineSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['text', 'tone'],
    properties: {
      text: { type: 'string' },
      tone: { enum: terminalTones },
      /** A link under the mouse pointer, with its hint. */
      hovered: {
        type: 'object',
        additionalProperties: false,
        required: ['hint'],
        properties: { hint: { type: 'string' } },
      },
    },
  },
} as const

/** The props of the row of terminal tabs, as `TerminalTabs` takes them. */
export const terminalTabsProperties = {
  /** The numbers of the open terminals, in order. */
  numbers: { type: 'array', items: { type: 'integer', minimum: 1 } },
  /** The number of the shown terminal. */
  shown: { type: 'integer', minimum: 1 },
  /** The row is at the limit of 10 terminals, so + is off. */
  atLimit: { type: 'boolean' },
  /** The screen that the close button of the shown terminal opens. */
  closeTo: { type: 'string', minLength: 1 },
} as const
