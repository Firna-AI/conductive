import type { TextBlock } from '../../../../src/chat/markdown/agent-blocks'
import {
  bullets,
  code,
  heading,
  item,
  p,
  strong,
  under,
  type Inline,
} from './agentText'
import type { ChatItem } from './conversations'

/** A tool call of a turn that finished. */
function run(id: string, target: string, detail?: string): ChatItem {
  return { kind: 'tool', id, tool: 'run', target, detail, status: 'done' }
}

/** The grades of a choice, such as `**Severity:** Medium.`, in bold. */
function grades(severity: string, effort: string): Inline[] {
  return [
    strong('Severity:'),
    ` ${severity}. `,
    strong('Effort:'),
    ` ${effort}.`,
  ]
}

/** A lettered option of a choice, such as `**A.** Wait 250 ms.` */
function option(letter: string, ...text: Inline[]): Inline[] {
  return [strong(`${letter}.`), ' ', ...text]
}

/** The bold fields of a choice, with its lettered options under Options. */
function choiceFields(fields: {
  grades: readonly Inline[]
  problem: readonly Inline[]
  options: readonly (readonly Inline[])[]
  recommendation: string
}): TextBlock {
  return bullets(
    item(...fields.grades),
    item(strong('Problem:'), ' ', ...fields.problem),
    under(
      item(strong('Options:')),
      bullets(...fields.options.map((text) => item(...text))),
    ),
    item(strong('Recommendation:'), ` ${fields.recommendation}`),
  )
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
      p(
        'The suggestions work, and the unit and end-to-end tests pass. Two choices need your answer before you merge.',
      ),
      heading(2, 'Needs your answer'),
      heading(3, '1. Lookups can pass the rate limit'),
      choiceFields({
        grades: grades('Medium', 'Small'),
        problem: [
          'Each key press sends a lookup to ',
          code('/api/places'),
          '. Fast typing sends about 8 a second, and the provider allows 5.',
        ],
        options: [
          option(
            'A',
            'Wait 250 ms after the last key press. Suggestions show a little later.',
          ),
          option(
            'B',
            'Keep the last 50 queries in the places proxy. Each new query still counts.',
          ),
        ],
        recommendation:
          'A, because it stops the extra lookups before they leave the browser.',
      }),
      heading(4, 'How I checked'),
      p(
        'The end-to-end test that types an address fast got 3 responses with status ',
        code('429'),
        '.',
      ),
      heading(3, '2. Suggestions cover the manual fields'),
      choiceFields({
        grades: grades('Low', 'Small'),
        problem: [
          'On a phone, the list of suggestions covers the city and postcode fields.',
        ],
        options: [
          option('A', 'Move the fields down while the list is open.'),
          option(
            'B',
            'Hide the fields until the person chooses to type the address.',
          ),
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
        item(
          'Wait 250 ms after the last key press in ',
          code('useAddressAutocomplete'),
          '.',
        ),
        item(
          'Move the manual fields down while the list of suggestions is open.',
        ),
        item('Run the checkout tests, then push.'),
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
      p('Both changes are in.'),
      heading(3, 'Test results'),
      bullets(
        item(
          strong('Unit tests:'),
          ' 15 passed, with a new test for the debounce.',
        ),
        item(
          strong('End-to-end tests:'),
          ' 3 passed, and the places proxy returned no ',
          code('429'),
          '.',
        ),
      ),
    ],
  },
  run('push', 'git push'),
  {
    kind: 'agent',
    id: 'done',
    blocks: [
      p(
        'Done. I pushed both changes to #482. Each lookup waits 250 ms after the last key press, and the manual fields move down while suggestions show.',
      ),
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '3m 18s', files: [] },
]

/** The chats of the heading pages: an answer and work with headings. */
export const headingConversations = {
  headings: reviewTurn,
  'headings-in-work': fixTurn,
} as const satisfies Record<string, readonly ChatItem[]>
