import type { MentionEntry } from '../../../../src/ui/components/chat/mentionEntry'
import type { TextBlock } from '../../../../src/chat/markdown/agent-blocks'
import { code, p } from './agentText'
import type { ChatItem } from './conversations'

/**
 * The folder of the repository of Checkout address autocomplete in its
 * cloud computer. An absolute path in an answer names an entry of the tree
 * only under this folder.
 */
export const repositoryFolder = '/home/user/code/storefront'

/**
 * The files and folders of Checkout address autocomplete. All files draws
 * the same tree, with some folders closed. The context folder holds the
 * screenshots that an agent took before and after a fix.
 */
export const mentionEntries: readonly MentionEntry[] = [
  { path: '.context', folder: true },
  { path: '.context/shots', folder: true },
  { path: '.context/shots/after.png', folder: false, preview: 'screenshot' },
  { path: '.context/shots/before.png', folder: false },
  { path: '.github', folder: true },
  { path: '.github/workflows', folder: true },
  { path: '.github/workflows/ci.yml', folder: false },
  { path: 'prisma', folder: true },
  { path: 'prisma/schema.prisma', folder: false },
  { path: 'public', folder: true },
  { path: 'src', folder: true },
  { path: 'src/app', folder: true },
  { path: 'src/app/api', folder: true },
  { path: 'src/app/api/addresses', folder: true },
  { path: 'src/app/api/addresses/route.ts', folder: false },
  { path: 'src/app/checkout', folder: true },
  { path: 'src/app/checkout/AddressForm.tsx', folder: false },
  { path: 'src/app/checkout/page.tsx', folder: false },
  {
    path: 'src/app/checkout/useAddressAutocomplete.ts',
    folder: false,
    preview: 'code',
  },
  { path: 'src/app/layout.tsx', folder: false },
  { path: 'src/lib', folder: true },
  { path: 'src/lib/places.ts', folder: false },
  { path: 'tests', folder: true },
  { path: 'tests/checkout', folder: true },
  { path: 'tests/checkout/address.test.ts', folder: false },
  { path: '.env.example', folder: false },
  { path: 'next.config.ts', folder: false },
  { path: 'package.json', folder: false },
  { path: 'README.md', folder: false, preview: 'markdown' },
  { path: 'tsconfig.json', folder: false },
]

/**
 * The drafts of the list of `@`. The text after the last `@` is the query.
 * `none` names no file, and `start` has no query yet. `omitted` names
 * tsconfig.json, which a limited tree leaves out.
 */
export const mentionDrafts = {
  query: 'Reuse the postcode check from @addr',
  start: 'Compare the lookup with @',
  none: 'Reuse the postcode check from @zipcode',
  omitted: 'Turn on strict mode in @tsconfig',
} as const

/**
 * A draft with a file chip and a folder chip. Each mention is `@` and the
 * path inside the repository, and a folder path ends with `/`.
 */
export const mentionChipsDraft =
  'Move the lookup in @src/app/checkout/useAddressAutocomplete.ts into @src/lib/ and keep its tests green.'

/**
 * The draft of Address autocomplete after Add to chat on the row of
 * AddressForm.tsx: the chip at the end of the text, with a space after it,
 * as a pick from the list of `@` puts it.
 */
export const addedChipDraft =
  'Add a test for the postcode check in @src/app/checkout/AddressForm.tsx '

/** The message that Cal sent with a file chip and a folder chip. */
const mentionAsk =
  'Move the lookup in @src/app/checkout/useAddressAutocomplete.ts into @src/lib/ so the cart can reuse it.'

/**
 * The answer of the agent. Its mentions and the path `src/lib` in code show
 * as file chips, and the function name stays code.
 */
const mentionAnswer: readonly TextBlock[] = [
  p(
    'I moved the lookup into a new ',
    code('lookupAddress'),
    ' function in @src/lib/ and kept @src/app/checkout/useAddressAutocomplete.ts as a thin wrapper, so the address form did not change.',
  ),
  p(
    'The cart can now import ',
    code('lookupAddress'),
    ' from ',
    code('src/lib'),
    '. The checkout tests still pass.',
  ),
]

/**
 * The chats of Checkout address autocomplete after a message with file
 * chips. `history` is the finished turn before it.
 */
export function fileMentionConversations(history: readonly ChatItem[]) {
  return {
    'mention-answer': [
      ...history,
      { kind: 'user', id: 'mention-ask', text: mentionAsk },
      {
        kind: 'tool',
        id: 'mention-read',
        tool: 'read',
        target: 'src/app/checkout/useAddressAutocomplete.ts',
        status: 'done',
      },
      {
        kind: 'tool',
        id: 'mention-edit',
        tool: 'edit',
        target: 'src/lib/addressLookup.ts',
        detail: '+52',
        status: 'done',
      },
      {
        kind: 'tool',
        id: 'mention-test',
        tool: 'run',
        target: 'npm test -- checkout',
        detail: '15 passed',
        status: 'done',
      },
      { kind: 'agent', id: 'mention-answer', blocks: mentionAnswer },
      {
        kind: 'turn-end',
        id: 'mention-turn-end',
        duration: '2m 06s',
        files: [
          {
            path: 'src/lib/addressLookup.ts',
            change: 'added',
            added: 52,
            removed: 0,
          },
          {
            path: 'src/app/checkout/useAddressAutocomplete.ts',
            change: 'modified',
            added: 6,
            removed: 49,
          },
        ],
      },
    ],
  } as const satisfies Record<string, readonly ChatItem[]>
}
