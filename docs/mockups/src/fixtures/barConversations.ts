import {
  agentPrompt,
  restackPrompt,
  type AgentAction,
} from '../../../../src/ui/components/workspace/barCopy'
import { code, p } from './agentText'
import { continuedBranch, promptFacts } from './barActions'
import type { ChatItem } from './conversations'
import { queuedPromptFacts, restackFacts } from './mergeQueue'
import type { PersonKey } from './members'
import { repositories } from './repositories'
import { movedBranch, movedRepository } from './repositoryMove'

/**
 * The note of Continue in a session: the member who pressed Continue, the
 * new branch of the workspace, and the base that it starts from. All
 * members see the same chat, so the item records `by`.
 */
export type ContinuedItem = {
  kind: 'continued'
  id: string
  by: PersonKey
  branch: string
  base: string
}

/**
 * The note of a repository change in a session: the member who changed
 * it, the new repository, and the new branch.
 */
export type RepositoryChangedItem = {
  kind: 'repository-changed'
  id: string
  by: PersonKey
  repository: string
  branch: string
}

/** The transcripts of the actions of the pull request bar. */
export const barConversationKeys = [
  'sent-fix-checks',
  'sent-create-pull-request',
  'sent-commit-and-push',
  'sent-push',
  'sent-resolve-conflicts',
  'sent-address-review',
  'sent-restack',
  'sent-rebase-conflicts',
  'restack-ended',
  'after-merge-running',
  'continued',
  'continued-by-member',
  'repository-changed',
] as const

type BarConversationKey = (typeof barConversationKeys)[number]

/** The transcripts in which a turn runs. */
export const barRunningConversations: readonly BarConversationKey[] = [
  'sent-fix-checks',
  'sent-create-pull-request',
  'sent-commit-and-push',
  'sent-push',
  'sent-resolve-conflicts',
  'sent-address-review',
  'sent-restack',
  'sent-rebase-conflicts',
  'after-merge-running',
]

/**
 * The message that an agent action sends, as a message of the member who
 * clicked, and the turn that it starts. `text` takes the place of the
 * prompt of the action: the one turn of the merge queue, which goes as a
 * message of the queuer, or the rebase of conflicts on a queued workspace.
 */
function sent(action: AgentAction, text?: string): readonly ChatItem[] {
  return [
    {
      kind: 'user',
      id: 'action',
      text: text ?? agentPrompt(action, promptFacts),
    },
    { kind: 'working', id: 'working', elapsed: '6s' },
  ]
}

/** A command of the agent that ran to its end. */
function ran(id: string, target: string, detail?: string): ChatItem {
  return { kind: 'tool', id, tool: 'run', target, detail, status: 'done' }
}

/**
 * The one turn of the merge queue for a conflict of its restack of #482,
 * as a message of Cal, who queued it (decision 321 A). The agent stops the
 * rebase, because the conflict needs a choice about the layout, so the
 * turn ends and the conflict stays.
 */
const restackEnded: readonly ChatItem[] = [
  { kind: 'user', id: 'restack', text: restackPrompt(restackFacts) },
  ran(
    'restack-fetch',
    `git fetch origin refs/pull/${restackFacts.basePullNumber}/head`,
  ),
  ran(
    'restack-rebase',
    `git rebase --onto ${restackFacts.baseHead} ${restackFacts.oldBase}`,
    '1 conflict',
  ),
  {
    kind: 'tool',
    id: 'restack-read',
    tool: 'read',
    target: 'src/app/checkout/AddressForm.tsx',
    status: 'done',
  },
  ran('restack-abort', 'git rebase --abort'),
  {
    kind: 'agent',
    id: 'restack-answer',
    blocks: [
      p(
        'I stopped the rebase, so the branch is unchanged. #479 now puts the Apple Pay button in the address step of ',
        code('AddressForm.tsx'),
        ", where this branch shows the address suggestions. Both layouts work, so the choice is yours. Tell me which one to keep, and I'll finish the rebase.",
      ),
    ],
  },
  { kind: 'turn-end', id: 'restack-end', duration: '1m 52s', files: [] },
]

function continued(by: PersonKey): ContinuedItem {
  return {
    kind: 'continued',
    id: 'continued',
    by,
    branch: continuedBranch,
    base: promptFacts.base,
  }
}

/**
 * Each agent action after the turn that pushed the branch: Create pull
 * request after the turn that a stop cut off, and the others after the
 * turn that opened #482. The merge queue adds its one turn for a conflict
 * of its restack, while it runs and after it ended with the conflict, and
 * the rebase of conflicts that Resolve conflicts sends on a queued
 * workspace. Then a turn that runs after the merge, the note of Continue,
 * from Cal and from Priya, and the note of a repository change.
 */
export function barConversations(turns: {
  history: readonly ChatItem[]
  cutOff: readonly ChatItem[]
}): Readonly<Record<BarConversationKey, readonly ChatItem[]>> {
  const { history } = turns
  const stopped: ChatItem = { kind: 'stopped', id: 'stopped', by: 'cal' }
  return {
    'sent-fix-checks': [...history, ...sent('fix-checks')],
    'sent-create-pull-request': [
      ...turns.cutOff,
      stopped,
      ...sent('create-pull-request'),
    ],
    'sent-commit-and-push': [...history, ...sent('commit-and-push')],
    'sent-push': [...history, ...sent('push')],
    'sent-resolve-conflicts': [...history, ...sent('resolve-conflicts')],
    'sent-address-review': [...history, ...sent('address-review')],
    // The one turn of the merge queue, as a message of Cal, who queued #482.
    'sent-restack': [
      ...history,
      ...sent('resolve-conflicts', restackPrompt(restackFacts)),
    ],
    'restack-ended': [...history, ...restackEnded],
    // Resolve conflicts on the queued workspace after that turn, from Cal.
    'sent-rebase-conflicts': [
      ...history,
      ...restackEnded,
      ...sent(
        'resolve-conflicts',
        agentPrompt('resolve-conflicts', queuedPromptFacts),
      ),
    ],
    'after-merge-running': [
      ...history,
      {
        kind: 'user',
        id: 'release-note',
        text: 'Draft the release note for the address autocomplete in `CHANGELOG.md`.',
      },
      { kind: 'working', id: 'working', elapsed: '38s' },
    ],
    continued: [...history, continued('cal')],
    'continued-by-member': [...history, continued('priya')],
    'repository-changed': [
      ...history,
      {
        kind: 'repository-changed',
        id: 'repository-changed',
        by: 'cal',
        repository: repositories[movedRepository].name,
        branch: movedBranch,
      },
    ],
  }
}
