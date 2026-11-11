import type { ChatItem } from './conversations'
import { bullets, type MessageList } from './listConversations'

/** The levels of a Markdown heading, from `#` to `######`. */
type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

/** A heading of a message, at the level that the agent wrote. */
export type MessageHeading = {
  kind: 'heading'
  level: HeadingLevel
  text: string
}

/** A heading, such as `## Needs your answer` at level 2. */
function heading(level: HeadingLevel, text: string): MessageHeading {
  return { kind: 'heading', level, text }
}

/** A tool call of a turn that finished. */
function run(id: string, target: string, detail?: string): ChatItem {
  return { kind: 'tool', id, tool: 'run', target, detail, status: 'done' }
}

/** The bold fields of a choice, with its lettered options under Options. */
function choiceFields(fields: {
  grades: string
  problem: string
  options: readonly string[]
  recommendation: string
}): MessageList {
  return {
    kind: 'list',
    numbered: false,
    items: [
      { text: fields.grades },
      { text: `**Problem:** ${fields.problem}` },
      { text: '**Options:**', list: bullets(...fields.options) },
      { text: `**Recommendation:** ${fields.recommendation}` },
    ],
  }
}

/**
 * A review that ends with two choices for the user, under the headings
 * that the agent wrote: a title, a section, a heading for each choice, and
 * a smaller heading inside the first choice.
 */
const reviewTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-review',
    text: 'Review #482 before I merge it. Tell me what needs my answer.',
  },
  run('diff', 'gh pr diff 482'),
  run('unit', 'npm test -- checkout', '14 passed'),
  run('e2e', 'npx playwright test checkout.spec.ts', '3 passed'),
  {
    kind: 'agent',
    id: 'review',
    blocks: [
      heading(1, 'Review of #482'),
      'The suggestions work, and the unit and end-to-end tests pass. Two choices need your answer before you merge.',
      heading(2, 'Needs your answer'),
      heading(3, '1. Lookups can pass the rate limit'),
      choiceFields({
        grades: '**Severity:** Medium. **Effort:** Small.',
        problem:
          'Each key press sends a lookup to `/api/places`. Fast typing sends about 8 a second, and the provider allows 5.',
        options: [
          '**A.** Wait 250 ms after the last key press. Suggestions show a little later.',
          '**B.** Keep the last 50 queries in the places proxy. Each new query still counts.',
        ],
        recommendation:
          'A, because it stops the extra lookups before they leave the browser.',
      }),
      heading(4, 'How I checked'),
      'The end-to-end test that types an address fast got 3 responses with status `429`.',
      heading(3, '2. Suggestions cover the manual fields'),
      choiceFields({
        grades: '**Severity:** Low. **Effort:** Small.',
        problem:
          'On a phone, the list of suggestions covers the city and postcode fields.',
        options: [
          '**A.** Move the fields down while the list is open.',
          '**B.** Hide the fields until the person chooses to type the address.',
        ],
        recommendation: 'A, because the person still sees each field.',
      }),
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '2m 36s', files: [] },
]

/**
 * A finished turn whose work holds two messages with headings. The first
 * starts with its heading, and the second has a heading under its first
 * paragraph. Both fold with the work, before the answer.
 */
const fixTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-fix',
    text: 'Add the 250 ms debounce, and move the manual fields down while suggestions show. Then push to #482.',
  },
  {
    kind: 'agent',
    id: 'plan',
    blocks: [
      heading(2, 'Plan'),
      bullets(
        'Wait 250 ms after the last key press in `useAddressAutocomplete`.',
        'Move the manual fields down while the list of suggestions is open.',
        'Run the checkout tests, then push.',
      ),
    ],
  },
  {
    kind: 'tool',
    id: 'edit-hook',
    tool: 'edit',
    target: 'src/app/checkout/useAddressAutocomplete.ts',
    detail: '+18 −3',
    status: 'done',
  },
  {
    kind: 'tool',
    id: 'edit-form',
    tool: 'edit',
    target: 'src/app/checkout/AddressForm.tsx',
    detail: '+9 −2',
    status: 'done',
  },
  run('unit', 'npm test -- checkout', '15 passed'),
  run('e2e', 'npx playwright test checkout.spec.ts', '3 passed'),
  {
    kind: 'agent',
    id: 'results',
    blocks: [
      'Both changes are in.',
      heading(3, 'Test results'),
      bullets(
        '**Unit tests:** 15 passed, with a new test for the debounce.',
        '**End-to-end tests:** 3 passed, and the places proxy returned no `429`.',
      ),
    ],
  },
  run('push', 'git push'),
  {
    kind: 'agent',
    id: 'done',
    blocks: [
      'Done. I pushed both changes to #482. Each lookup waits 250 ms after the last key press, and the manual fields move down while suggestions show.',
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '3m 18s', files: [] },
]

/** The chats of the heading pages: an answer and work with headings. */
export const headingConversations = {
  headings: reviewTurn,
  'headings-in-work': fixTurn,
} as const satisfies Record<string, readonly ChatItem[]>
