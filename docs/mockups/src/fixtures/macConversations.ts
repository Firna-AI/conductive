import type { ChatItem } from './conversations'
import {
  safariByFile,
  safariSuite,
  safariTest,
  waitingWithScript,
  type MacCommandRequest,
  type MacCommandState,
} from './mac'

/**
 * The finished turn, then a message that needs Safari, which only the Mac
 * of the sender has. `after` is what follows the request on the Mac.
 */
function onMac(
  history: readonly ChatItem[],
  state: MacCommandState,
  after: readonly ChatItem[],
  ask: { text: string; request: MacCommandRequest } = {
    text: 'Run the checkout test in Safari on my Mac too.',
    request: safariTest,
  },
): readonly ChatItem[] {
  return [
    ...history,
    { kind: 'user', id: 'ask-safari', text: ask.text },
    {
      kind: 'agent',
      id: 'plan-safari',
      paragraphs: [
        'The cloud computer has no Safari, so I asked to run it on your Mac.',
      ],
    },
    { kind: 'mac-command', id: 'mac', request: ask.request, state },
    ...after,
  ]
}

const working: ChatItem = { kind: 'working', id: 'working', elapsed: '18s' }

/** The agent goes on without Safari, from the tests of the cloud computer. */
const withoutSafari: ChatItem = {
  kind: 'agent',
  id: 'without-safari',
  paragraphs: [
    'I did not run it in Safari. The checkout tests pass in WebKit on the cloud computer, which is close to Safari.',
  ],
}

/**
 * The finished turn, then a message that needs four commands on the Mac.
 * The first is a long script, and every request waits for its answer.
 */
function manyOnMac(history: readonly ChatItem[]): readonly ChatItem[] {
  return [
    ...history,
    {
      kind: 'user',
      id: 'ask-hang',
      text: 'One checkout test hangs in Safari on my Mac. Find out which one.',
    },
    {
      kind: 'agent',
      id: 'plan-hang',
      paragraphs: [
        'I asked to run each checkout test file in Safari on your Mac, and to read the versions for the bug report.',
      ],
    },
    ...[safariByFile, ...waitingWithScript].map((request, index): ChatItem => ({
      kind: 'mac-command',
      id: `mac-${index + 1}`,
      request,
      state: 'waiting',
    })),
    working,
  ]
}

/**
 * The chats of a command on the Mac of the sender (decision 62), after the
 * finished turn of `history`: it waits for approval, for the checkout test
 * or for the whole suite, it was denied, it ran, or the Mac is not there.
 */
export function macConversations(history: readonly ChatItem[]) {
  return {
    'mac-waiting': onMac(history, 'waiting', [working]),
    'mac-waiting-many': manyOnMac(history),
    'mac-waiting-suite': onMac(history, 'waiting', [working], {
      text: 'Run all the Safari tests on my Mac before we merge.',
      request: safariSuite,
    }),
    'mac-denied': onMac(history, 'denied', [withoutSafari]),
    'mac-done': onMac(history, 'done', [
      {
        kind: 'agent',
        id: 'safari-passed',
        paragraphs: ['The checkout test passes in Safari on your Mac.'],
      },
    ]),
    'mac-unavailable': onMac(history, 'unavailable', [withoutSafari]),
  } as const satisfies Record<string, readonly ChatItem[]>
}
