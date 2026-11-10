import { appDomain } from '../brand'
import { defaultChoice, type AgentChoice } from './agents'
import { people, type PersonKey } from './members'
import { orgs, type Org } from './orgs'
import type { RepositoryKey } from './repositories'
import type { SectionKey } from './sections'

/**
 * What a workspace is doing. `working` means an agent turn runs, and
 * `unread` means a turn ended with output that the user has not seen.
 * `input` means that the turn waits for the user, such as for the
 * approval of a command on a Mac. All three run on a ready sandbox.
 * `archived` means that Archive stopped its cloud computer, which the app
 * deletes 14 days later, and that its chat is read-only. The other values
 * are the sandbox states.
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

/**
 * What a screen shows of a workspace: its activity, or `inactive`. An
 * inactive workspace came from an import of Conductor and has no cloud
 * computer until a member activates it.
 */
export type WorkspaceStatus = ActivityStatus | 'inactive'

export type Workspace = {
  key: string
  /**
   * Its name. A new workspace has no name until its title comes, and the
   * screen then shows the label of `nameLabel` in `src/shared/`.
   */
  name: string
  /**
   * The number of the workspace in its org. It counts up from 1 in the
   * order of creation. The header and each chip show it as a label,
   * such as `W-395`.
   */
  number: number
  /**
   * The web address of the workspace, with the IDs of its org and of the
   * workspace. Copy link copies it, and a message keeps it under a chip,
   * so the label can change later.
   */
  link: string
  branch: string
  repository: RepositoryKey
  section: SectionKey
  /** The agent, model, and effort of its last message. */
  choice: AgentChoice
  /** The status in the workspace list when the screen opens. */
  status: WorkspaceStatus
  /** The time since the last activity, such as `2h`. */
  updated: string
  /**
   * The member who created it, until an admin reassigns it. Each session
   * runs on the agent login of the member who started it.
   */
  owner: PersonKey
  /** The workspace came from an import of Conductor, which it shows. */
  from?: 'conductor'
}

/** A workspace of the list when the app opens. None of them is inactive. */
type ListedWorkspace = Workspace & { status: ActivityStatus }

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
 * such as `calummoore/lisbon-7k2q`, as decision 53 says.
 */
function branchFor(owner: PersonKey, name: string): string {
  return `${people[owner].login}/${name}`
}

export const checkoutAutocomplete: ListedWorkspace = {
  key: 'checkout-autocomplete',
  name: 'Checkout address autocomplete',
  number: 395,
  link: workspaceLink('19v5znSjpADj4i7RmHDBMV2eKxcVeLbJh6lamYBLd6M'),
  branch: branchFor('cal', 'checkout-autocomplete'),
  repository: 'storefront',
  section: 'checkout',
  choice: defaultChoice,
  status: 'stopped',
  updated: '2h',
  owner: 'cal',
}

/**
 * The workspace that the create flow makes, the newest of Acme. It has no
 * name from the send until its title comes, about a second later, while
 * the sandbox starts. `name` is that title, from a small model that reads
 * the first message. A failed title request leaves the workspace without a
 * name until a later message with text. Its branch keeps a city name with
 * a random suffix.
 */
export const savedCarts: Workspace = {
  key: 'saved-carts',
  name: 'Saved carts',
  number: 402,
  link: workspaceLink('ffpdvCrydZ85CicAsK7cqpirDrbK6GhAA6hB33ck1vE'),
  branch: branchFor('cal', 'lisbon-7k2q'),
  repository: 'storefront',
  section: 'general',
  choice: defaultChoice,
  status: 'starting',
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
  ListedWorkspace,
  'number' | 'repository' | 'section' | 'status' | 'updated'
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
): ListedWorkspace {
  const { id, owner = 'cal', ...rest } = details
  const branch = branchFor(owner, key)
  return { key, name, link: workspaceLink(id), branch, choice, ...rest, owner }
}

/** The workspaces of Acme when the app opens, newest first in each section. */
export const workspaceList: readonly ListedWorkspace[] = [
  workspace('email-dark-mode', 'Dark mode for emails', {
    number: 401,
    id: 'O9k18xFxGwojR6dZ-C3QxC6x0UdyUubyOLkiNw_N73o',
    repository: 'marketing-site',
    section: 'general',
    status: 'starting',
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
      updated: 'now',
    },
    codex,
  ),
  workspace('webhook-retries', 'Retry failed webhooks', {
    number: 399,
    id: 'dKe1UpohWZD_r7BFTPBvx9FhBhZRb5I_Ec77f_T-ALM',
    repository: 'billing-service',
    section: 'checkout',
    status: 'unread',
    updated: '5m',
  }),
  workspace('apple-pay', 'Apple Pay button', {
    number: 398,
    id: 'Vi1ajLlUgS7Q581Q6lWrNplWT2aOgFeubaecbNP1gDM',
    repository: 'storefront',
    section: 'checkout',
    status: 'ready',
    updated: '12m',
  }),
  checkoutAutocomplete,
  workspace('next-16', 'Upgrade to Next.js 16', {
    number: 396,
    id: 'D6PoTiiZc0Hjl_YPwUGBE39vNTb-i2kKLIfKALHf3wU',
    repository: 'storefront',
    section: 'infra',
    status: 'ready',
    updated: '20m',
  }),
  workspace('retry-queue', 'Move retries to a queue', {
    number: 391,
    id: 'NM4Zxi-VthgkFMFmG9UN4BSzpBfLH-Z7RZQStgmP09w',
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
