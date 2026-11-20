/**
 * The words of the end reason of a turn: a cause, other than the end of the
 * agent's reply or a Stop, that ended the turn. A finished turn keeps its
 * duration and its files, and one line above them names the cause. A
 * stopped turn names the cause on its stopped line, in place of "The agent
 * stopped". The words name what stopped, not the number of a limit, because
 * the member cannot change it.
 */

import type { TurnEndReason } from '../../../../../src/shared/generated/TurnEndReason'

/**
 * Each end reason that the chat names. The generated `TurnEndReason` does
 * not hold `cloud_computer_stopped` yet, so the mockups add it here. It ends
 * a turn as stopped when the cloud computer stopped while the agent worked,
 * and no member and no part of the app asked for the stop.
 */
export type ChatEndReason = TurnEndReason | 'cloud_computer_stopped'

const reasons: Readonly<Record<ChatEndReason, string>> = {
  background_work_limit: 'Background work stopped at the time limit',
  cloud_computer_stopped: 'The cloud computer stopped',
}

/**
 * The line of an end reason, such as "Background work stopped at the time
 * limit".
 */
export function endReasonText(reason: ChatEndReason): string {
  return reasons[reason]
}
