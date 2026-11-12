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

const standardSpeed = 'Standard speed'

/** Whether the line can name a cause code that the end of a turn gives. */
function isStandardSpeedCause(code: string): code is StandardSpeedCause {
  return Object.hasOwn(causes, code)
}

/**
 * The cause that the line names for a cause code of the end of a turn, or
 * none for a code that the app does not know, such as a new cause.
 */
export function knownSpeedCause(
  code: string | undefined,
): StandardSpeedCause | undefined {
  return code !== undefined && isStandardSpeedCause(code) ? code : undefined
}

/**
 * The words of the line, such as "Standard speed · Fast limit reached". They
 * name the cause and no time until a limit resets, because the line stays in
 * the chat after the reset. Without a cause that the app knows, the line says
 * "Standard speed" alone.
 */
export function standardSpeedText(cause?: StandardSpeedCause): string {
  return cause === undefined
    ? standardSpeed
    : `${standardSpeed} · ${causes[cause]}`
}
