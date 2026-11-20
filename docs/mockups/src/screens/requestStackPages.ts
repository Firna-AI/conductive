import type { ConversationKey } from '../fixtures/conversations'
import { paths } from '../paths'

type StackPages = Partial<Record<ConversationKey, readonly string[]>>

/**
 * The pages of each stack of requests that the catalogue draws in a
 * browser: one page for each card on top, in the order of the stack.
 * Previous and Next of the stack link to them.
 */
const browserPages: StackPages = {
  'secret-waiting-late': [
    paths.secretStack,
    paths.secretStackNext,
    paths.secretStackLast,
  ],
  'mac-waiting-secret': [paths.secretStackMac, paths.secretStackMacNext],
}

/** The pages of each stack of requests that the Mac app draws. */
const macPages: StackPages = {
  'mac-waiting-many': [paths.macRequests, paths.macRequestsNext],
}

/**
 * The pages of the stack of requests of a chat, in a browser or in the Mac
 * app. A stack without pages draws Previous and Next as plain buttons.
 */
export function stackPagesOf(
  conversation: ConversationKey,
  mac: boolean,
): readonly string[] | undefined {
  return (mac ? macPages : browserPages)[conversation]
}
