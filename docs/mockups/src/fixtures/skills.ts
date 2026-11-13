import type { ChatItem } from './conversations'

/**
 * A skill that the agent can use, as the runner reports it: the name of its
 * folder or of its front matter, and the description of its `SKILL.md`.
 */
export type Skill = {
  name: string
  description: string
}

/**
 * The skills of Checkout address autocomplete, in name order. The runner
 * cuts each description to 300 characters, and the list cuts it again to
 * one line.
 */
export const skills: readonly Skill[] = [
  {
    name: 'brainstorming',
    description:
      'Use when the user asks for a feature or a change and no decision chooses how to build it, before you plan it.',
  },
  {
    name: 'documentation',
    description:
      'Use before you write or edit a README.md, anything under docs/, a protocol doc, or a code comment.',
  },
  {
    name: 'git-commit',
    description:
      'Use before you commit and directly after, when you write a commit message or a pull request title and description.',
  },
  {
    name: 'mockups',
    description:
      'Use before you create or change a mockup under docs/mockups, a screen component, or a user flow.',
  },
  {
    name: 'plans',
    description:
      'Use before you write any code or start an implementation, when the user asks for a plan, or when you add a decision to a plan.',
  },
  {
    name: 'product-ui',
    description:
      'Use before you implement or change a screen, a component, or a view, and when you write user-facing text.',
  },
  {
    name: 'testing',
    description:
      'Use before you implement a feature, a behaviour change, or a bug fix, and before you write, change, or remove a test.',
  },
]

/**
 * The drafts of the list of `/`. The text after the last `/` is the query,
 * and `start` has no query yet.
 */
export const skillDrafts = {
  query: '/pl',
  start: '/',
} as const

/**
 * A draft with a skill chip. The stored text of the chip is `/` and the
 * name of the skill, at the start of the text.
 */
export const skillChipDraft =
  '/plans Add a saved address book to the checkout, so a member can pick a past address.'

/** The answer of the agent, after it ran the skill. */
const skillAnswer: readonly string[] = [
  'I wrote the plan in `plans/saved-address-book.md`. It has a mockup milestone first, then the address store, the picker in `AddressForm`, and the tests.',
  'It asks you one decision: keep the addresses for each member, or for each org.',
]

/**
 * The chats of Checkout address autocomplete after a message with a skill
 * chip. `history` is the finished turn before it.
 */
export function skillConversations(history: readonly ChatItem[]) {
  return {
    'skill-answer': [
      ...history,
      { kind: 'user', id: 'skill-ask', text: skillChipDraft },
      {
        kind: 'tool',
        id: 'skill-read',
        tool: 'read',
        target: 'src/app/checkout/AddressForm.tsx',
        status: 'done',
      },
      {
        kind: 'tool',
        id: 'skill-plan',
        tool: 'create',
        target: 'plans/saved-address-book.md',
        detail: '+64',
        status: 'done',
      },
      { kind: 'agent', id: 'skill-answer', blocks: skillAnswer },
      {
        kind: 'turn-end',
        id: 'skill-turn-end',
        duration: '1m 12s',
        files: [
          {
            path: 'plans/saved-address-book.md',
            change: 'added',
            added: 64,
            removed: 0,
          },
        ],
      },
    ],
  } as const satisfies Record<string, readonly ChatItem[]>
}
