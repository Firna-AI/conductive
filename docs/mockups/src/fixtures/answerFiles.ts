import type { ChatItem } from './conversations'

/** The message of Cal before the answer with file chips. */
const answerAsk =
  'The suggestions cover the postcode field on a phone. Can you fix it, and show me where the hook skips short queries?'

/**
 * The answer of the agent. A mention, an absolute path under the repository
 * folder, and a relative path with a line target show as file chips. A path
 * in another repository and the code block stay code.
 */
const fileAnswer = [
  'I moved the list of suggestions under the postcode field in @src/app/checkout/AddressForm.tsx, so it no longer covers the field. The phone view after the fix is in `/home/user/code/storefront/.context/shots/after.png`.',
  'The hook skips a query under three characters in `src/app/checkout/useAddressAutocomplete.ts:19-22`. The billing service checks postcodes in `/home/user/code/billing-service/src/postcode.ts`, which I left as it is.',
  'I took the screenshot with:',
  {
    kind: 'code',
    text: 'npx playwright screenshot --device="iPhone 13" http://localhost:3000/checkout .context/shots/after.png',
  },
] as const

/**
 * The chats of Checkout address autocomplete with an answer that names
 * files of the tree. `history` is the finished turn before it.
 */
export function answerFileConversations(history: readonly ChatItem[]) {
  return {
    'file-answer': [
      ...history,
      { kind: 'user', id: 'file-answer-ask', text: answerAsk },
      {
        kind: 'tool',
        id: 'file-answer-read',
        tool: 'read',
        target: 'src/app/checkout/AddressForm.tsx',
        status: 'done',
      },
      {
        kind: 'tool',
        id: 'file-answer-edit',
        tool: 'edit',
        target: 'src/app/checkout/AddressForm.tsx',
        detail: '+4 −2',
        status: 'done',
      },
      {
        kind: 'tool',
        id: 'file-answer-shot',
        tool: 'run',
        target: 'npx playwright screenshot --device="iPhone 13"',
        status: 'done',
      },
      { kind: 'agent', id: 'file-answer', blocks: fileAnswer },
      {
        kind: 'turn-end',
        id: 'file-answer-turn-end',
        duration: '1m 12s',
        files: [
          {
            path: 'src/app/checkout/AddressForm.tsx',
            change: 'modified',
            added: 4,
            removed: 2,
          },
        ],
      },
    ],
  } as const satisfies Record<string, readonly ChatItem[]>
}
