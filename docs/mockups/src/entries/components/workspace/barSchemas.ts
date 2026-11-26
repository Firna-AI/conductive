import { defined } from '../../../defined'
import type {
  AgentAction,
  BarMessageKind,
  MergeMethod,
} from '../../../../../../src/ui/components/workspace/barCopy'
import type { PrStatus } from '../../../components/workspace/prStatus'
import { bannerStates } from '../../../../../../src/ui/components/workspace/barModel'
import {
  mergeProblems,
  queueSteps,
  queueWaits,
  turnWaits,
} from '../../../../../../src/ui/components/workspace/queueModel'
import { iconKeyOf, iconKeys, type IconKey } from '../common/icons'

/** The agent actions of the bar, as `AgentAction` lists them. */
const agentActions = [
  'create-pull-request',
  'commit-and-push',
  'push',
  'fix-checks',
  'resolve-conflicts',
  'address-review',
] as const satisfies readonly AgentAction[]

/** The merge methods of GitHub, as `MergeMethod` lists them. */
const mergeMethods = [
  'merge',
  'squash',
  'rebase',
] as const satisfies readonly MergeMethod[]

/** The messages under the bar, as `BarMessageKind` lists them. */
export const barMessageKinds = [
  'merge-moved-head',
  'merge-no-right',
  'merge-refused',
  'merge-stack-held',
  'ready-no-right',
  'ready-pull-changed',
  'ready-refused',
  'continue-waits',
  'continue-failed',
  'base-moved',
] as const satisfies readonly BarMessageKind[]

/** A button of the bar as JSON, as `BarAction`. */
const barActionSchema = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'action'],
      properties: { kind: { const: 'agent' }, action: { enum: agentActions } },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'method', 'busy'],
      properties: {
        kind: { const: 'merge' },
        method: { enum: mergeMethods },
        busy: { type: 'boolean' },
        /** The layers of the merge queue that land with it. */
        below: { type: 'integer', minimum: 0 },
        stackCount: { type: 'integer', minimum: 2 },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'busy'],
      properties: {
        /** Ready for review of a draft. */
        kind: { const: 'ready' },
        /** The change runs. */
        busy: { type: 'boolean' },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'busy', 'waiting'],
      properties: {
        kind: { const: 'continue' },
        busy: { type: 'boolean' },
        /** A turn runs, so Continue is not available yet. */
        waiting: { type: 'boolean' },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['kind', 'busy', 'disabled'],
      properties: {
        kind: { const: 'archive' },
        busy: { type: 'boolean' },
        disabled: { type: 'boolean' },
      },
    },
  ],
} as const

/** The line of a queued workspace under the bar, as `QueueLine`. */
export const queueLineSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'place', 'size', 'below', 'step', 'remove'],
  properties: {
    kind: { const: 'entry' },
    place: { type: 'integer', minimum: 1 },
    size: { type: 'integer', minimum: 1 },
    /** The pull request below it, or null for the bottom layer. */
    below: { anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] },
    step: { enum: queueSteps },
    /** The lowest layer below it that the queue waits for. */
    waitsFor: { type: 'integer', minimum: 1 },
    /** Why the queue could not merge it. */
    problem: { enum: mergeProblems },
    /** What holds the message that the queue sends as the queuer. */
    turnWait: { enum: turnWaits },
    queueWait: { enum: queueWaits },
    stackedAbove: { type: 'integer', minimum: 1 },
    remove: { type: 'boolean' },
    /** The cloud computer holds work that is not pushed. */
    localWork: { const: true },
  },
} as const

/** What the bar and the top of the Checks tab show, as `BarModel`. */
export const barModelSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['banner', 'actions', 'localWork'],
  properties: {
    banner: { enum: bannerStates },
    actions: { type: 'array', items: barActionSchema },
    /** The link to the pull request on GitHub. */
    link: { const: 'open' },
    message: { enum: barMessageKinds },
    /** The sandbox has local work, so Continue asks first. */
    localWork: { type: 'boolean' },
    /** The merge queue: Add to merge queue, and the line of an entry. */
    queue: {
      type: 'object',
      additionalProperties: false,
      required: ['add'],
      properties: { add: { type: 'boolean' }, line: queueLineSchema },
    },
  },
} as const

/** The tones of a pull request bar. */
const prTones = [
  'neutral',
  'success',
  'warning',
  'danger',
  'merged',
] as const satisfies readonly PrStatus['tone'][]

/** The state of a pull request as JSON, as `PrStatus` with an icon key. */
export const prStatusSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['busy', 'text', 'tone'],
  properties: {
    /** A spinner shows while checks run. */
    busy: { type: 'boolean' },
    icon: { enum: iconKeys },
    text: { type: 'string' },
    /** More detail, which a wide bar shows after the text. */
    detail: { type: 'string' },
    tone: { enum: prTones },
  },
} as const

/** The state of a pull request with the key of its icon, for a wrapper. */
export function prStatusData(
  status: PrStatus,
): Omit<PrStatus, 'icon'> & { icon?: IconKey } {
  const { icon, detail, ...rest } = status
  return { ...rest, ...defined({ detail, icon: icon && iconKeyOf(icon) }) }
}
