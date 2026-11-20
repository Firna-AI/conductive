/**
 * The chat of the task list pages of `app/chat/lists`, in Checkout address
 * autocomplete. The agent writes `- [ ]` and `- [x]` items, which show as
 * fixed check boxes (item 14 B of the Markdown plan).
 */

import type { ChatItem } from './conversations'
import { bullets } from './listConversations'
import { pullRequest } from './pullRequests'

/** The two changes of the review of Priya, as the tasks of the agent. */
const waitTask = 'Debounce the lookups'
const fieldsTask = 'Move the fields under the list'

/**
 * A finished turn whose messages track the two changes of the review of
 * Priya with a task list: both open at the start, one done after the
 * first edit, and both done with the push left in the last message of the
 * work. The answer has the two changes done and the approval open, with a
 * note in a list under it.
 */
const taskListTurn: readonly ChatItem[] = [
  {
    kind: 'user',
    id: 'ask-changes',
    text: `Make both changes that Priya asked for, then push them to #${pullRequest.number}.`,
  },
  {
    kind: 'agent',
    id: 'tasks',
    blocks: [
      'Two changes to make:',
      bullets(`[ ] ${waitTask}`, `[ ] ${fieldsTask}`),
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
    kind: 'agent',
    id: 'first-done',
    blocks: [bullets(`[x] ${waitTask}`, `[ ] ${fieldsTask}`)],
  },
  {
    kind: 'tool',
    id: 'edit-form',
    tool: 'edit',
    target: 'src/app/checkout/AddressForm.tsx',
    detail: '+9 −2',
    status: 'done',
  },
  {
    kind: 'agent',
    id: 'both-done',
    blocks: [
      'Both changes pass the tests:',
      bullets(
        `[x] ${waitTask}`,
        `[x] ${fieldsTask}`,
        `[ ] Push them to #${pullRequest.number}`,
      ),
    ],
  },
  { kind: 'tool', id: 'push', tool: 'run', target: 'git push', status: 'done' },
  {
    kind: 'agent',
    id: 'pushed',
    blocks: [
      `I pushed both changes to #${pullRequest.number}:`,
      {
        kind: 'list',
        numbered: false,
        items: [
          {
            text: '[x] Each lookup waits 250 ms after the last key press, in `useAddressAutocomplete`.',
          },
          { text: '[x] On a phone, the fields move down under the list.' },
          {
            text: '[ ] Priya approves the changes.',
            list: bullets('She asked to see the phone test first.'),
          },
        ],
      },
      'Only her approval is left.',
    ],
  },
  { kind: 'turn-end', id: 'turn-end', duration: '2m 36s', files: [] },
]

/** The chats of the task list pages. */
export const taskListConversations = {
  'task-lists': taskListTurn,
} as const satisfies Record<string, readonly ChatItem[]>
