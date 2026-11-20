/**
 * The words of the end reason of a turn: a cause, other than the end of the
 * agent's reply or a Stop, that ended the turn. A finished turn keeps its
 * duration and its files, and one line above them names the cause. A
 * stopped turn names the cause on its stopped line, in place of "The agent
 * stopped". The words name what stopped, not the number of a limit, because
 * the member cannot change it.
 */

import type { TurnEndReason } from '../../../../../src/shared/generated/TurnEndReason'

const reasons: Readonly<Record<TurnEndReason, string>> = {
  background_work_limit: 'Background work stopped at the time limit',
  cloud_computer_stopped: 'The cloud computer stopped',
}

/**
 * The line of an end reason, such as "Background work stopped at the time
 * limit".
 */
export function endReasonText(reason: TurnEndReason): string {
  return reasons[reason]
}
