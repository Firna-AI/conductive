/**
 * The words of the line of a stopped turn, for the chat and for the copy of
 * a transcript. The line names who stopped the turn: a member who pressed
 * Stop, no one, or the session whose agent stopped it with a workspace tool.
 * The app and the mockups take them from here.
 */

/** A stop with no Stop request, such as when the cloud computer stops. */
export const stoppedUnnamed = 'The agent stopped'

/**
 * The line of a Stop that a member pressed. `who` is "You" for that member
 * and the name of that member for the others, as "Priya stopped the agent".
 */
export function memberStopped(who: string): string {
  return `${who} stopped the agent`
}

/**
 * The words before the session of an agent that stopped the turn with a
 * workspace tool. The chat shows the chip of that session after them, and
 * the copy of a transcript shows the session link.
 */
export const stoppedFrom = 'Stopped from'
