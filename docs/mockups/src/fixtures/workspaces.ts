import { defaultChoice, type AgentChoice } from './agents'
import type { RepositoryKey } from './repositories'
import type { SectionKey } from './sections'

/**
 * What a workspace is doing. `working` means an agent turn runs, and
 * `unread` means a turn ended with output that the user has not seen. Both
 * run on a ready sandbox. The other values are the sandbox states.
 */
export type ActivityStatus =
  'working' | 'unread' | 'ready' | 'starting' | 'stopped' | 'error'

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
   * The name that the app gives a new workspace, a city, until the agent's
   * first answer names it after the task.
   */
  generatedName?: string
}

export const checkoutAutocomplete: Workspace = {
  key: 'checkout-autocomplete',
  name: 'Checkout address autocomplete',
  branch: 'cal/checkout-autocomplete',
  repository: 'storefront',
  section: 'checkout',
  choice: defaultChoice,
  status: 'stopped',
  updated: '2h',
}

/** The workspace that the create flow makes. */
export const savedCarts: Workspace = {
  key: 'saved-carts',
  name: 'Saved carts',
  generatedName: 'Lisbon',
  branch: 'cal/lisbon-7k2q',
  repository: 'storefront',
  section: 'general',
  choice: defaultChoice,
  status: 'starting',
  updated: 'now',
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

function workspace(
  key: string,
  name: string,
  details: Pick<Workspace, 'repository' | 'section' | 'status' | 'updated'>,
  choice: AgentChoice = defaultChoice,
): Workspace {
  return { key, name, branch: `cal/${key}`, choice, ...details }
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
    },
    codex,
  ),
  workspace('pricing-copy', 'Pricing page copy', {
    repository: 'marketing-site',
    section: 'general',
    status: 'stopped',
    updated: '3d',
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
    status: 'stopped',
    updated: '1d',
  }),
  workspace('retry-queue', 'Move retries to a queue', {
    repository: 'billing-service',
    section: 'infra',
    status: 'stopped',
    updated: '2d',
  }),
]

/** The workspace that the drag state moves, and where it lands. */
export const workspaceDrag = {
  workspace: 'webhook-retries',
  section: 'general',
  index: 1,
} as const
