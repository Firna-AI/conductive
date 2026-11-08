import { defaultChoice, type AgentChoice } from './agents'
import { people, type PersonKey } from './members'
import type { RepositoryKey } from './repositories'
import type { SectionKey } from './sections'

/**
 * What a workspace is doing. `working` means an agent turn runs, and
 * `unread` means a turn ended with output that the user has not seen.
 * `input` means that the turn waits for the user, such as for the
 * approval of a command on a Mac. All three run on a ready sandbox.
 * `archived` means that its cloud computer is deleted and its chat is
 * read-only. The other values are the sandbox states.
 */
export type ActivityStatus =
  | 'working'
  | 'input'
  | 'unread'
  | 'ready'
  | 'starting'
  | 'stopped'
  | 'error'
  | 'archived'

/** The workspaces that a screen can show open. */
export const openableWorkspaces = [
  'checkout-autocomplete',
  'saved-carts',
] as const

export type OpenableWorkspace = (typeof openableWorkspaces)[number]

export type Workspace = {
  key: string
  name: string
  branch: string
  repository: RepositoryKey
  section: SectionKey
  /** The agent, model, and effort of its last message. */
  choice: AgentChoice
  /** The status in the workspace list when the app opens. */
  status: ActivityStatus
  /** The time since the last activity, such as `2h`. */
  updated: string
  /**
   * The member who created it, until an admin reassigns it. Each session
   * runs on the agent login of the member who started it.
   */
  owner: PersonKey
  /**
   * The name that the app gives a new workspace, a city, until the agent's
   * first answer names it after the task.
   */
  generatedName?: string
}

/**
 * The branch of a workspace: the GitHub login of its owner, then a name,
 * such as `calummoore/lisbon-7k2q`, as decision 53 says.
 */
function branchFor(owner: PersonKey, name: string): string {
  return `${people[owner].login}/${name}`
}

export const checkoutAutocomplete: Workspace = {
  key: 'checkout-autocomplete',
  name: 'Checkout address autocomplete',
  branch: branchFor('cal', 'checkout-autocomplete'),
  repository: 'storefront',
  section: 'checkout',
  choice: defaultChoice,
  status: 'stopped',
  updated: '2h',
  owner: 'cal',
}

/** The workspace that the create flow makes. */
export const savedCarts: Workspace = {
  key: 'saved-carts',
  name: 'Saved carts',
  generatedName: 'Lisbon',
  branch: branchFor('cal', 'lisbon-7k2q'),
  repository: 'storefront',
  section: 'general',
  choice: defaultChoice,
  status: 'starting',
  updated: 'now',
  owner: 'cal',
}

export const openableWorkspaceRecords: Readonly<
  Record<OpenableWorkspace, Workspace>
> = {
  'checkout-autocomplete': checkoutAutocomplete,
  'saved-carts': savedCarts,
}

const codex: AgentChoice = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'medium',
}

type Details = Pick<Workspace, 'repository' | 'section' | 'status' | 'updated'>

/** A workspace of Acme. Its branch starts with the GitHub login of its owner. */
function workspace(
  key: string,
  name: string,
  details: Details & { owner?: PersonKey },
  choice: AgentChoice = defaultChoice,
): Workspace {
  const owner = details.owner ?? 'cal'
  return { key, name, branch: branchFor(owner, key), choice, ...details, owner }
}

/** The workspaces of Acme when the app opens, newest first in each section. */
export const workspaceList: readonly Workspace[] = [
  workspace('email-dark-mode', 'Dark mode for emails', {
    repository: 'marketing-site',
    section: 'general',
    status: 'starting',
    updated: 'now',
  }),
  workspace(
    'invoice-fonts',
    'Invoice PDF fonts',
    {
      repository: 'billing-service',
      section: 'general',
      status: 'error',
      updated: '40m',
      owner: 'priya',
    },
    codex,
  ),
  workspace('pricing-copy', 'Pricing page copy', {
    repository: 'marketing-site',
    section: 'general',
    status: 'stopped',
    updated: '3d',
    owner: 'priya',
  }),
  workspace(
    'fix-cart-flake',
    'Fix flaky cart test',
    {
      repository: 'storefront',
      section: 'checkout',
      status: 'working',
      updated: 'now',
    },
    codex,
  ),
  workspace('webhook-retries', 'Retry failed webhooks', {
    repository: 'billing-service',
    section: 'checkout',
    status: 'unread',
    updated: '5m',
  }),
  workspace('apple-pay', 'Apple Pay button', {
    repository: 'storefront',
    section: 'checkout',
    status: 'ready',
    updated: '12m',
  }),
  checkoutAutocomplete,
  workspace('next-16', 'Upgrade to Next.js 16', {
    repository: 'storefront',
    section: 'infra',
    status: 'ready',
    updated: '20m',
  }),
  workspace('retry-queue', 'Move retries to a queue', {
    repository: 'billing-service',
    section: 'infra',
    status: 'stopped',
    updated: '2d',
    owner: 'jonas',
  }),
]

/** The workspace that the drag state moves, and where it lands. */
export const workspaceDrag = {
  workspace: 'webhook-retries',
  section: 'general',
  index: 1,
} as const
