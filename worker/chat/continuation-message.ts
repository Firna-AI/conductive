import type { UserMessage } from '../../src/shared/generated/UserMessage'
import { productName } from '../../docs/mockups/src/brand'

export interface ContinuationInput {
  chainStartedAt: number
  sourceSessionId: string
}

export function continuationMessage(
  sourceSessionId: string,
  randomId: () => string,
): Pick<UserMessage, 'id' | 'text'> {
  return {
    id: `continuation:${randomId()}`,
    text:
      `This message comes from ${productName}, not from a member. ` +
      'The cloud computer of this workspace stopped while you worked, and it started again. ' +
      'Your processes may have ended, also background tasks, dev servers, and shells. ' +
      'Continue the task from where you stopped. Do not repeat work that is done. ' +
      'Before you repeat an action outside this computer, such as a push, a pull request, or a message, check whether it already happened. ' +
      `The work is in session ${sourceSessionId}. ` +
      `If you lack the context of the task, use read_session to read session ${sourceSessionId} before you continue.`,
  }
}
