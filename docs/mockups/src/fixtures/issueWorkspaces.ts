import type { ChatItem } from './conversations'
import { issueLabel, postcodeIssue } from './issues'
import { codex, workspace, workspaceList, type Workspace } from './workspaces'

/**
 * The workspace that Start makes from the postcode issue. It takes the
 * title of the issue as its name, and it joins the section of the issue.
 */
export const postcodeWorkspace: Workspace = workspace(
  'guest-postcode',
  'Guest checkout drops the postcode',
  {
    number: 403,
    id: 'hX2p0cWq7bVv1nKkQ0m3Jr8sUeT5yLaZgD4fNoPiC6E',
    repository: 'storefront',
    section: 'checkout',
    status: 'working',
    github: null,
    updated: 'now',
  },
)

/**
 * The two attempts at the postcode issue, in variation C: the same task
 * with Claude and with Codex, so that the two pull requests can be
 * compared. Each shows under the issue, so its name says only its agent.
 */
export const postcodeClaudeWorkspace: Workspace = {
  ...postcodeWorkspace,
  key: 'guest-postcode-claude',
  name: 'Postcode fix with Claude',
  status: 'unread',
  github: 'ready-to-merge',
  updated: '4m',
}

export const postcodeCodexWorkspace: Workspace = workspace(
  'guest-postcode-codex',
  'Postcode fix with Codex',
  {
    number: 404,
    id: 'Qm9vZ1sTt3kLx8cWbN0aR5hJ2yUeP7oVfD6iGzK4nM1',
    repository: 'storefront',
    section: 'checkout',
    status: 'working',
    github: 'checks-running',
    updated: 'now',
  },
  codex,
)

/** Each workspace that an issue of the explorations can link to. */
export const issueWorkspaces: readonly Workspace[] = [
  postcodeWorkspace,
  postcodeClaudeWorkspace,
  postcodeCodexWorkspace,
  ...workspaceList,
]

/** The workspace of a key, from the list and the workspaces of issues. */
export function workspaceOf(key: string): Workspace {
  const found = issueWorkspaces.find((item) => item.key === key)
  if (found) return found
  throw new Error(`No workspace ${key}`)
}

/**
 * The first message that Start writes from the issue: its label and
 * title, then its description. The agent can read the whole issue with
 * its tools.
 */
export const postcodeFirstMessage = [
  `${issueLabel(postcodeIssue.number)}: ${postcodeIssue.title}`,
  '',
  ...postcodeIssue.body,
].join('\n')

/** The chat of the new workspace, a minute after Start. */
export const postcodeChat: readonly ChatItem[] = [
  { kind: 'user', id: 'issue', text: postcodeFirstMessage },
  {
    kind: 'agent',
    id: 'plan',
    blocks: [
      "I'll reproduce the guest checkout first, then look at how the country field resets the form.",
    ],
  },
  {
    kind: 'tool',
    id: 'read-form',
    tool: 'read',
    target: 'src/checkout/AddressForm.tsx',
    status: 'done',
  },
  {
    kind: 'tool',
    id: 'search-reset',
    tool: 'search',
    target: 'resetField("postcode")',
    status: 'done',
  },
  {
    kind: 'tool',
    id: 'run-test',
    tool: 'run',
    target: 'npm test -- AddressForm',
    status: 'running',
  },
  { kind: 'working', id: 'working', elapsed: '48s' },
]
