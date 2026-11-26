import type { TurnEndReason } from '../../../../../../src/shared/generated/TurnEndReason'
import type {
  LostReason,
  LostWhat,
} from '../../../../../../src/ui/components/chat/lostCopy'
import type { StandardSpeedCause } from '../../../../../../src/ui/components/chat/speedCopy'
import type { MacCommandState } from '../../../fixtures/mac'

/** The data that a refused event carried, as `LostWhat` lists them. */
export const lostWhats = [
  'turn-start',
  'status',
  'reply-part',
  'reply',
  'tool-update',
  'turn-end',
  'turn-error',
  'all-files',
  'changes',
  'start-steps',
  'title',
  'servers',
  'agent-update',
  'update',
] as const satisfies readonly LostWhat[]

/** Why the workspace refused an event, as `LostReason` lists them. */
export const lostReasons = [
  'too_large',
  'invalid',
  'turn_not_active',
] as const satisfies readonly LostReason[]

/** Why a fast turn ran at standard speed, as `StandardSpeedCause`. */
export const speedCauses = [
  'fast_limit',
  'older_runner',
] as const satisfies readonly StandardSpeedCause[]

/** The causes other than the reply that end a turn, as `TurnEndReason`. */
export const turnEndReasons = [
  'background_work_limit',
] as const satisfies readonly TurnEndReason[]

/** What happened to a command on the Mac, as `MacCommandState`. */
export const macCommandStates = [
  'waiting',
  'denied',
  'done',
  'unavailable',
  'mac-access-off',
] as const satisfies readonly MacCommandState[]
