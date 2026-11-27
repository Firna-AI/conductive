import { appDomain } from '../../../../src/shared/brand'
import { defaultChoice, type AgentChoice } from './agents'
import { people, type PersonKey } from './members'
import { orgs, type Org } from './orgs'
import { repositories } from './repositories'
import type { Workspace } from './workspaceType'

export type { Workspace } from './workspaceType'

/**
 * The workspaces that a screen can show open. Postcode lookup for the
 * shipping and billing forms is removed: a chip opens its read-only chat.
 */
export const openableWorkspaces = [
  'checkout-autocomplete',
  'saved-carts',
  'postcode-lookup',
] as const

export type OpenableWorkspace = (typeof openableWorkspaces)[number]

/** The branch that the work of a workspace goes to. */
export function baseBranchOf(workspace: Workspace): string {
  return (
    workspace.baseBranch ?? repositories[workspace.repository].defaultBranch
  )
}

/**
 * The web address of a workspace: the app, the ID of the org, and the ID
 * of the workspace, a random string as the app gives it.
 */
export function workspaceLink(
  workspaceId: string,
  org: Org = orgs.acme,
): string {
  return `https://${appDomain}/orgs/${org.id}/workspaces/${workspaceId}`
}

/**
 * The branch of a workspace: the GitHub login of its owner, then a name,
 * such as `calummoore/saved-carts-7k2q`, as decision 53 says.
 */
function branchFor(owner: PersonKey, name: string): string {
  return `${people[owner].login}/${name}`
}

export const checkoutAutocomplete: Workspace = {
  key: 'checkout-autocomplete',
  name: 'Checkout address autocomplete',
  number: 395,
  link: workspaceLink('19v5znSjpADj4i7RmHDBMV2eKxcVeLbJh6lamYBLd6M'),
  branch: branchFor('cal', 'checkout-autocomplete'),
  repository: 'storefront',
  section: 'checkout',
  choice: defaultChoice,
  status: 'stopped',
  github: 'ready-to-merge',
  updated: '2h',
  owner: 'cal',
}

/**
 * The workspace that the create flow makes, the newest of Acme. It has no
 * name from the send until its title comes, about a second later, while
 * the sandbox starts. `name` is that title, from a small model that reads
 * the first message. A failed title request leaves the workspace without a
 * name until a later message with text. Its branch starts with a city name
 * and a random suffix. It takes the title with the same suffix, because the
 * title comes before the sandbox creates the branch.
 */
export const savedCarts: Workspace = {
  key: 'saved-carts',
  name: 'Saved carts',
  number: 402,
  link: workspaceLink('ffpdvCrydZ85CicAsK7cqpirDrbK6GhAA6hB33ck1vE'),
  branch: branchFor('cal', 'saved-carts-7k2q'),
  placeholderBranch: branchFor('cal', 'lisbon-7k2q'),
  repository: 'storefront',
  section: 'general',
  choice: defaultChoice,
  status: 'starting',
  messageWaiting: true,
  github: null,
  updated: 'now',
  owner: 'cal',
}

/** The Codex model and effort of the workspaces that use Codex. */
export const codex: AgentChoice = {
  agent: 'codex',
  model: 'GPT-6.1 Sol',
  effort: 'medium',
}

type Details = Pick<
  Workspace,
  | 'number'
  | 'repository'
  | 'section'
  | 'status'
  | 'messageWaiting'
  | 'github'
  | 'updated'
> & {
  /** The ID of the workspace in its link. */
  id: string
  owner?: PersonKey
}

/** A workspace of Acme. Its branch starts with the GitHub login of its owner. */
export function workspace(
  key: string,
  name: string,
  details: Details,
  choice: AgentChoice = defaultChoice,
): Workspace {
  const { id, owner = 'cal', ...rest } = details
  const branch = branchFor(owner, key)
  return { key, name, link: workspaceLink(id), branch, choice, ...rest, owner }
}

/**
 * A workspace whose agent finished a turn that Cal has not read yet. Its
 * pull request is ready to merge, so its list mark is green and only its
 * bold name shows the unread output.
 */
export const webhookRetries: Workspace = workspace(
  'webhook-retries',
  'Retry failed webhooks',
  {
    number: 399,
    id: 'dKe1UpohWZD_r7BFTPBvx9FhBhZRb5I_Ec77f_T-ALM',
    repository: 'billing-service',
    section: 'checkout',
    status: 'unread',
    github: 'ready-to-merge',
    updated: '5m',
  },
)

/** The workspaces of Acme when the app opens, newest first in each section. */
export const workspaceList: readonly Workspace[] = [
  workspace('email-dark-mode', 'Dark mode for emails', {
    number: 401,
    id: 'O9k18xFxGwojR6dZ-C3QxC6x0UdyUubyOLkiNw_N73o',
    repository: 'marketing-site',
    section: 'general',
    status: 'starting',
    messageWaiting: true,
    github: null,
    updated: 'now',
  }),
  workspace(
    'invoice-fonts',
    'Invoice PDF fonts',
    {
      number: 397,
      id: 'P6TigmLANbi1rKL6IHM5YPp4G95FysReAy4FWUAn6m8',
      repository: 'billing-service',
      section: 'general',
      status: 'error',
      github: 'checks-failed',
      updated: '40m',
      owner: 'priya',
    },
    codex,
  ),
  workspace('pricing-copy', 'Pricing page copy', {
    number: 389,
    id: 'n0xP51lF7RiJGPlSS16EhTqHcD6HSbnMVGPM3fPKsxk',
    repository: 'marketing-site',
    section: 'general',
    status: 'stopped',
    github: 'merged',
    updated: '3d',
    owner: 'priya',
  }),
  workspace(
    'fix-cart-flake',
    'Fix flaky cart test',
    {
      number: 400,
      id: 'tQqSgUwtBpPQ389LeaIEwlXvZvrUuva9WJPG9YvAuds',
      repository: 'storefront',
      section: 'checkout',
      status: 'working',
      github: 'checks-running',
      updated: 'now',
    },
    codex,
  ),
  webhookRetries,
  workspace('apple-pay', 'Apple Pay button', {
    number: 398,
    id: 'Vi1ajLlUgS7Q581Q6lWrNplWT2aOgFeubaecbNP1gDM',
    repository: 'storefront',
    section: 'checkout',
    status: 'ready',
    github: 'checks-failed',
    updated: '12m',
  }),
  checkoutAutocomplete,
  workspace('next-16', 'Upgrade to Next.js 16', {
    number: 396,
    id: 'D6PoTiiZc0Hjl_YPwUGBE39vNTb-i2kKLIfKALHf3wU',
    repository: 'storefront',
    section: 'infra',
    status: 'ready',
    github: 'conflict',
    updated: '20m',
  }),
  workspace('retry-queue', 'Move retries to a queue', {
    number: 391,
    id: 'NM4Zxi-VthgkFMFmG9UN4BSzpBfLH-Z7RZQStgmP09w',
    repository: 'billing-service',
    section: 'infra',
    status: 'stopped',
    github: 'checks-running',
    updated: '2d',
    owner: 'jonas',
  }),
]

/** The workspace that the drag state moves, and where it lands. */
export const workspaceDrag = {
  kind: 'workspace',
  workspace: 'webhook-retries',
  section: 'general',
  index: 1,
} as const
