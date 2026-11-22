import { defined } from '../../../defined'
import type {
  AgentAction,
  BarMessageKind,
  MergeMethod,
} from '../../../components/workspace/barCopy'
import type { PrStatus } from '../../../components/workspace/prStatus'
import { bannerStates } from '../../../fixtures/pullRequests'
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
