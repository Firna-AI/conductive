import type { ChatItem } from './conversations'

/**
 * A file or a folder of the branch, as the kept file tree has it: its path
 * inside the repository. The list of `@` and the chips read these entries.
 */
export type MentionEntry = {
  path: string
  folder: boolean
  /** The tab that a press on the chip of this file shows, when drawn. */
  preview?: 'code' | 'markdown'
}

/**
 * The files and folders of Checkout address autocomplete. All files draws
 * the same tree, with some folders closed.
 */
export const mentionEntries: readonly MentionEntry[] = [
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
 * `none` names no file, and `start` has no query yet.
 */
export const mentionDrafts = {
  query: 'Reuse the postcode check from @addr',
  start: 'Compare the lookup with @',
  none: 'Reuse the postcode check from @zipcode',
} as const

/**
 * A draft with a file chip and a folder chip. Each mention is `@` and the
 * path inside the repository, and a folder path ends with `/`.
 */
export const mentionChipsDraft =
  'Move the lookup in @src/app/checkout/useAddressAutocomplete.ts into @src/lib/ and keep its tests green.'

/** The message that Cal sent with a file chip and a folder chip. */
const mentionAsk =
  'Move the lookup in @src/app/checkout/useAddressAutocomplete.ts into @src/lib/ so the cart can reuse it.'

/** The answer of the agent. Paths in an answer stay text. */
const mentionAnswer: readonly string[] = [
  'I moved the lookup into `src/lib/addressLookup.ts` and kept the hook as a thin wrapper, so the address form did not change.',
  'The cart can now import `lookupAddress` from `src/lib`. The checkout tests still pass.',
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
