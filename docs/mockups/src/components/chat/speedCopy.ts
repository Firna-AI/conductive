/**
 * The words of the end line of a fast turn that ran at standard speed (fast
 * mode decision 257). The line names the speed, then the cause, so that a
 * member who chose Fast learns why the turn was slower. A fast turn that ran
 * at fast speed, and a turn without fast mode, show no words.
 */

/**
 * Why a fast turn ran at standard speed: Claude reached its fast limit, or
 * the cloud computer has older software, which ignores fast mode.
 */
export type StandardSpeedCause = 'fast_limit' | 'older_runner'

const causes: Readonly<Record<StandardSpeedCause, string>> = {
  fast_limit: 'Fast limit reached',
  older_runner: 'Older cloud computer software',
}

/**
 * The words of the line, such as "Standard speed · Fast limit reached". They
 * name the cause and no time until a limit resets, because the line stays in
 * the chat after the reset.
 */
export function standardSpeedText(cause: StandardSpeedCause): string {
  return `Standard speed · ${causes[cause]}`
}
