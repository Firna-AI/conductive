import type { ConversationKey } from '../fixtures/conversations'

export const requestStackPaths = {
  secretStack: 'app/secret-requests/several/waiting-and-late',
  secretStackNext: 'app/secret-requests/several/waiting-and-late/next',
  secretStackLast: 'app/secret-requests/several/waiting-and-late/last',
  secretAskedDenied: 'app/secret-requests/several/asked-again/denied',
  secretAskedAllowed: 'app/secret-requests/several/asked-again/allowed',
  secretStackMac: 'app/secret-requests/several/mac-command',
  secretStackMacNext: 'app/secret-requests/several/mac-command/next',
  macRequests: 'mac-app/requests',
  macRequestsNext: 'mac-app/requests/next',
} as const

type StackPages = Partial<Record<ConversationKey, readonly string[]>>

/**
 * The pages of each stack of requests that the catalogue draws in a
 * browser: one page for each card on top, in the order of the stack.
 * Previous and Next of the stack link to them.
 */
const browserPages: StackPages = {
  'secret-waiting-late': [
    requestStackPaths.secretStack,
    requestStackPaths.secretStackNext,
    requestStackPaths.secretStackLast,
  ],
  'mac-waiting-secret': [
    requestStackPaths.secretStackMac,
    requestStackPaths.secretStackMacNext,
  ],
}

/** The pages of each stack of requests that the Mac app draws. */
const macPages: StackPages = {
  'mac-waiting-many': [
    requestStackPaths.macRequests,
    requestStackPaths.macRequestsNext,
  ],
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
