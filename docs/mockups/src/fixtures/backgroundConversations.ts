import {
  autocompletePullRequest,
  autocompleteStart,
  autocompleteTests,
} from './autocompleteTurn'
import type { ChatItem } from './conversations'
import { changedFiles } from './files'
import { bullets } from './listConversations'

/** The request of the canonical turn, with the merge after the checks. */
const mergeAsk: ChatItem = {
  kind: 'user',
  id: 'ask',
  text: 'Add address autocomplete to the checkout form. Use the places proxy at `/api/places`, and keep the manual fields as a fallback. Merge the pull request when its checks pass.',
}

/**
 * The work of the turn up to the end of the agent's reply. The agent opens
 * pull request #482, then watches its checks with a command in the
 * background. That call returns at once, so its line shows as done.
 */
const waitingWork: readonly ChatItem[] = [
  mergeAsk,
  ...autocompleteStart.filter((item) => item.kind !== 'user'),
  ...autocompleteTests,
  ...autocompletePullRequest,
  {
    kind: 'tool',
    id: 'watch-checks',
    tool: 'run',
    target: 'gh pr checks 482 --watch',
    status: 'done',
  },
  {
    kind: 'agent',
    id: 'done',
    blocks: [
      'Done. Checkout now suggests addresses as you type.',
      bullets(
        'Choosing a suggestion fills the street, city, and postcode.',
        'Manual entry still works when there is no match.',
        'Unit tests cover `useAddressAutocomplete`, and the checkout end-to-end tests pass.',
      ),
      "Opened pull request #482. I'm watching its checks, and I'll merge it when they pass.",
    ],
  },
]

/**
 * The chats of a turn that waits for its background work. The turn stays
 * open after the reply while the watch of the checks runs, and shows as a
 * running turn. The checks still run 120 minutes after the wait started, so
 * the runner stops the work at the time limit. The turn ends as finished,
 * with its duration, its files, and the end reason.
 */
export const backgroundConversations = {
  'background-waiting': [
    ...waitingWork,
    { kind: 'working', id: 'working', elapsed: '1h 12m' },
  ],
  'background-limit': [
    ...waitingWork,
    {
      kind: 'turn-end',
      id: 'turn-end',
      duration: '2h 4m',
      files: changedFiles,
      endReason: 'background_work_limit',
    },
  ],
} as const satisfies Record<string, readonly ChatItem[]>
