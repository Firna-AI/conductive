import type { ChatItem } from './conversations'
import { changedFiles } from './files'
import { safariTest } from './mac'

/**
 * The turn of the canonical chat, steered: after the form shows
 * suggestions, the user asks for a debounce while the agent works. The
 * message joins the turn and starts its second part, which ends the turn.
 */
function steeredTurn(chats: {
  start: readonly ChatItem[]
  tests: readonly ChatItem[]
  steer: string
}): readonly ChatItem[] {
  return [
    ...chats.start,
    {
      kind: 'agent',
      id: 'suggestions',
      paragraphs: [
        "Suggestions now show under the first address line, and choosing one fills the other fields. Next I'll add the tests.",
      ],
    },
    { kind: 'user', id: 'steer', text: chats.steer, during: true },
    {
      kind: 'agent',
      id: 'plan-debounce',
      paragraphs: [
        "I'll debounce the lookups in `useAddressAutocomplete` first.",
      ],
    },
    {
      kind: 'tool',
      id: 'debounce',
      tool: 'edit',
      target: 'src/app/checkout/useAddressAutocomplete.ts',
      detail: '+7 −2',
      status: 'done',
    },
    ...chats.tests,
    {
      kind: 'tool',
      id: 'e2e',
      tool: 'run',
      target: 'npx playwright test checkout.spec.ts',
      detail: '3 passed',
      status: 'done',
    },
    {
      kind: 'tool',
      id: 'readme',
      tool: 'edit',
      target: 'README.md',
      detail: '+4 −1',
      status: 'done',
    },
    {
      kind: 'tool',
      id: 'pr',
      tool: 'run',
      target: 'gh pr create --fill',
      detail: '#482',
      status: 'done',
    },
    {
      kind: 'agent',
      id: 'done',
      paragraphs: [
        'Done. Checkout suggests addresses as you type, and each lookup waits 250 ms after the last key press.',
      ],
      bullets: [
        'Choosing a suggestion fills the street, city, and postcode.',
        'Manual entry still works when there is no match.',
        'Opened pull request #482.',
      ],
    },
    {
      kind: 'turn-end',
      id: 'turn-end',
      duration: '5m 21s',
      files: changedFiles,
    },
  ]
}

/**
 * A finished turn whose work holds a command that ran on the Mac of the
 * sender and a tool update that was lost. Both fold with the work.
 */
const macAndLostTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-safari',
    text: 'Check that the address suggestions work in Safari before we merge.',
  },
  {
    kind: 'agent',
    id: 'plan-safari',
    paragraphs: [
      'The cloud computer has no Safari, so I asked to run the checkout test on your Mac.',
    ],
  },
  { kind: 'mac-command', id: 'mac', request: safariTest, state: 'done' },
  {
    kind: 'agent',
    id: 'plan-webkit',
    paragraphs: [
      "It passes in Safari. I'll also run the WebKit project of the end-to-end tests on the cloud computer, which covers the other checkout pages.",
    ],
  },
  {
    kind: 'tool',
    id: 'webkit',
    tool: 'run',
    target: 'npx playwright test checkout.spec.ts --project=webkit',
    detail: '3 passed',
    status: 'done',
  },
  { kind: 'lost', id: 'lost-trace', what: 'tool-update', reason: 'too_large' },
  {
    kind: 'agent',
    id: 'safari-done',
    paragraphs: [
      'The address suggestions work in Safari. The checkout test passes on your Mac, and the WebKit tests pass on the cloud computer.',
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '1m 38s', files: [] },
]

/**
 * The chats of the work of ended turns: a turn with a message sent during
 * it, and a turn whose work holds a Mac command card and a lost line,
 * which fold at their place. `start` and `tests` are the first runs of the
 * canonical turn, and `steer` is the message that the user sends while the
 * turn runs.
 */
export function workConversations(chats: {
  start: readonly ChatItem[]
  tests: readonly ChatItem[]
  steer: string
}) {
  return {
    steered: steeredTurn(chats),
    'mac-in-work': macAndLostTurn,
  } as const satisfies Record<string, readonly ChatItem[]>
}
