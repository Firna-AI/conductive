import type { RepositoryKey } from './repositories'

/**
 * What a workspace is doing. `working` means an agent turn runs on a ready
 * sandbox. The other values are the sandbox states.
 */
export type ActivityStatus =
  'working' | 'ready' | 'starting' | 'stopped' | 'error'

export type AgentKey = 'claude-code' | 'codex'

export const agentNames: Readonly<Record<AgentKey, string>> = {
  'claude-code': 'Claude Code',
  codex: 'Codex',
}

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
  agent: AgentKey
  /** The status in the workspace list when the app opens. */
  status: ActivityStatus
  /** The time since the last activity, such as `2h`. */
  updated: string
}

export const checkoutAutocomplete: Workspace = {
  key: 'checkout-autocomplete',
  name: 'Checkout address autocomplete',
  branch: 'cal/checkout-autocomplete',
  repository: 'storefront',
  agent: 'claude-code',
  status: 'stopped',
  updated: '2h',
}

/** The workspace that the create flow makes. */
export const savedCarts: Workspace = {
  key: 'saved-carts',
  name: 'Saved carts',
  branch: 'cal/saved-carts',
  repository: 'storefront',
  agent: 'claude-code',
  status: 'starting',
  updated: 'now',
}

export const openableWorkspaceRecords: Readonly<
  Record<OpenableWorkspace, Workspace>
> = {
  'checkout-autocomplete': checkoutAutocomplete,
  'saved-carts': savedCarts,
}

/** The workspace list when the app opens, newest first in each repository. */
export const workspaceList: readonly Workspace[] = [
  {
    key: 'cart-flake',
    name: 'Fix flaky cart test',
    branch: 'cal/fix-cart-flake',
    repository: 'storefront',
    agent: 'codex',
    status: 'working',
    updated: 'now',
  },
  checkoutAutocomplete,
  {
    key: 'next-16',
    name: 'Upgrade to Next.js 16',
    branch: 'cal/next-16',
    repository: 'storefront',
    agent: 'claude-code',
    status: 'stopped',
    updated: '1d',
  },
  {
    key: 'webhook-retries',
    name: 'Retry failed webhooks',
    branch: 'cal/webhook-retries',
    repository: 'billing-service',
    agent: 'claude-code',
    status: 'ready',
    updated: '5m',
  },
  {
    key: 'invoice-fonts',
    name: 'Invoice PDF fonts',
    branch: 'cal/invoice-fonts',
    repository: 'billing-service',
    agent: 'codex',
    status: 'error',
    updated: '40m',
  },
  {
    key: 'pricing-copy',
    name: 'Pricing page copy',
    branch: 'cal/pricing-copy',
    repository: 'marketing-site',
    agent: 'claude-code',
    status: 'stopped',
    updated: '3d',
  },
]
