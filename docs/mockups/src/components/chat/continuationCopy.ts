import { reconnectAction, type SessionLoginOwner } from './secretRunCopy'

/**
 * The words of the line of the app after a turn that the cloud computer
 * stopped while the agent worked, when no member and no part of the app
 * asked for the stop. The stopped line of that turn right above already
 * names the cause, "The cloud computer stopped", so this line says only what
 * comes next. No line says that the cloud computer started before it did.
 * The app and the mockups take them from here.
 */

/**
 * What comes after the stop. `turn`: a continuation turn waits, and it runs
 * when the cloud computer starts again. `reconnect`: no turn, because the
 * login of the session is gone, so the line names who connects it again.
 * `message`: no turn, because the cloud computer stopped again soon after
 * the last continuation, or the time limit of the chain of turns ended.
 */
export type ContinuationNext =
  | { kind: 'turn' }
  | { kind: 'reconnect'; owner: SessionLoginOwner; agent: string }
  | { kind: 'message' }

/**
 * The line, such as "The agent continues when the cloud computer starts
 * again". It ends with no period, as the other event lines of the chat. With
 * a login that is gone, the line says "can continue", because the reconnect
 * starts no turn by itself. It names who connects the login with the words
 * of the line of a late answer to a secret request.
 */
export function continuationText(next: ContinuationNext): string {
  switch (next.kind) {
    case 'turn':
      return 'The agent continues when the cloud computer starts again'
    case 'reconnect': {
      const action = reconnectAction(next.owner, next.agent)
      return `The agent can continue after ${action} again`
    }
    case 'message':
      return 'Send a message to continue'
  }
}
