import { agentPrompt, type AgentAction } from '../components/workspace/barCopy'
import { continuedBranch, promptFacts } from './barActions'
import type { ChatItem } from './conversations'
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
  'after-merge-running',
]

/**
 * The message that an agent action sends, as a message of the member who
 * clicked, and the turn that it starts.
 */
function sent(action: AgentAction): readonly ChatItem[] {
  return [
    { kind: 'user', id: 'action', text: agentPrompt(action, promptFacts) },
    { kind: 'working', id: 'working', elapsed: '6s' },
  ]
}

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
 * turn that opened #482. Then a turn that runs after the merge, the
 * note of Continue, from Cal and from Priya, and the note of a repository
 * change.
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
