/**
 * The words of the notice over the composer when a message of a member
 * starts a new linked session on the own login of that member, before Send.
 * The app and the mockups take them from here.
 */

/**
 * Why the message does not run on the login of the session's starter: that
 * login is not available, or the starter keeps it for their own messages.
 */
export type LinkedReason = 'unavailable' | 'private'

export const linkedTitle = 'Your message starts a new session'

/**
 * The reason under the title. `starter` is the name of the member who
 * started the session, or null for an older record that names nobody, and
 * `agent` is the name of the agent, such as "Claude".
 */
export function linkedReasonText(
  reason: LinkedReason,
  starter: string | null,
  agent: string,
): string {
  if (starter === null) return 'The login for this session is not available.'
  if (reason === 'private') {
    return `${starter}'s ${agent} login is for ${starter}'s messages only.`
  }
  return `${starter}'s ${agent} login is not available.`
}
