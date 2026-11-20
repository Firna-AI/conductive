import type { PersonKey } from './members'
import type { RepositoryKey } from './repositories'
import type { SectionKey } from './sections'

/**
 * The state of an issue. An issue without a workspace stays in Backlog or
 * Todo until someone starts work. In the explorations, the linked
 * workspaces move it on: a start makes it In progress, an open pull
 * request makes it In review, and the merge makes it Done.
 */
export type IssueStatus =
  'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done'

export const issueStatusOrder: readonly IssueStatus[] = [
  'in-progress',
  'in-review',
  'todo',
  'backlog',
  'done',
]

export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none'

export type Issue = {
  key: string
  /** The number of the issue in its org, which shows as `I-31`. */
  number: number
  title: string
  /** The paragraphs of the description. */
  body: readonly string[]
  /** The items of its checklist, and whether each one is done. */
  checklist?: readonly { text: string; done: boolean }[]
  status: IssueStatus
  priority: IssuePriority
  assignee?: PersonKey
  author: PersonKey
  /** The repository that a workspace of the issue starts in. */
  repository?: RepositoryKey
  /** The section of the list where the issue shows, in variation B. */
  section: SectionKey
  /** The keys of the workspaces that work on it, oldest first. */
  workspaces: readonly string[]
  updated: string
}

/** The label of an issue number, such as `I-31`. */
export function issueLabel(number: number): string {
  return `I-${number}`
}

/** The issue that every flow starts from: it has no workspace yet. */
export const postcodeIssue: Issue = {
  key: 'guest-postcode',
  number: 31,
  title: 'Guest checkout drops the postcode',
  body: [
    'When a guest changes the country at checkout, the postcode field clears. Two support tickets this week.',
    'Keep the postcode when the new country uses the same format. Clear it with a short note when it does not.',
  ],
  checklist: [
    { text: 'Reproduce on the guest checkout', done: false },
    { text: 'Keep the postcode for a matching format', done: false },
    { text: 'Add a test for the country change', done: false },
  ],
  status: 'todo',
  priority: 'high',
  assignee: 'cal',
  author: 'priya',
  repository: 'storefront',
  section: 'checkout',
  workspaces: [],
  updated: '2h',
}

/** The issues of Acme, newest first. */
export const issueList: readonly Issue[] = [
  {
    key: 'places-rate-limit',
    number: 35,
    title: 'Rate limit the Places API calls',
    body: ['The autocomplete calls the Places API on every key press.'],
    status: 'backlog',
    priority: 'medium',
    author: 'jonas',
    repository: 'storefront',
    section: 'checkout',
    workspaces: [],
    updated: '1d',
  },
  {
    key: 'stock-search',
    number: 34,
    title: 'Search shows items that are out of stock',
    body: ['Hide them, or sort them last.'],
    status: 'backlog',
    priority: 'low',
    assignee: 'jonas',
    author: 'jonas',
    repository: 'storefront',
    section: 'general',
    workspaces: [],
    updated: '3d',
  },
  {
    key: 'email-dark-mode',
    number: 33,
    title: 'Dark mode for order emails',
    body: ['Order emails are hard to read in dark mode.'],
    status: 'in-progress',
    priority: 'low',
    assignee: 'cal',
    author: 'cal',
    repository: 'marketing-site',
    section: 'general',
    workspaces: ['email-dark-mode'],
    updated: 'now',
  },
  {
    key: 'refund-email',
    number: 32,
    title: 'Refund email names the wrong amount',
    body: ['A partial refund shows the full order total.'],
    status: 'todo',
    priority: 'urgent',
    author: 'priya',
    repository: 'billing-service',
    section: 'general',
    workspaces: [],
    updated: '30m',
  },
  postcodeIssue,
  {
    key: 'cart-flake',
    number: 30,
    title: 'Cart test fails one run in ten',
    body: ['The cart total test fails on CI about one run in ten.'],
    status: 'in-progress',
    priority: 'high',
    assignee: 'cal',
    author: 'jonas',
    repository: 'storefront',
    section: 'checkout',
    workspaces: ['fix-cart-flake'],
    updated: 'now',
  },
  {
    key: 'address-autocomplete',
    number: 29,
    title: 'Address autocomplete at checkout',
    body: ['Suggest addresses as the shopper types.'],
    status: 'in-review',
    priority: 'medium',
    assignee: 'cal',
    author: 'cal',
    repository: 'storefront',
    section: 'checkout',
    workspaces: ['checkout-autocomplete', 'apple-pay'],
    updated: '12m',
  },
  {
    key: 'webhook-retries',
    number: 28,
    title: 'Retry failed payment webhooks',
    body: ['Stripe webhooks that fail are lost.'],
    status: 'in-review',
    priority: 'high',
    assignee: 'cal',
    author: 'priya',
    repository: 'billing-service',
    section: 'checkout',
    workspaces: ['webhook-retries'],
    updated: '5m',
  },
  {
    key: 'invoice-fonts',
    number: 27,
    title: 'Invoice PDFs use the wrong font',
    body: ['The PDFs fall back to Times.'],
    status: 'in-progress',
    priority: 'medium',
    assignee: 'priya',
    author: 'priya',
    repository: 'billing-service',
    section: 'general',
    workspaces: ['invoice-fonts'],
    updated: '40m',
  },
  {
    key: 'pricing-copy',
    number: 26,
    title: 'Copy for the new pricing plans',
    body: ['Four plans, with cloud hours.'],
    status: 'done',
    priority: 'none',
    assignee: 'priya',
    author: 'cal',
    repository: 'marketing-site',
    section: 'general',
    workspaces: ['pricing-copy'],
    updated: '3d',
  },
]

/** The issue of a workspace, when one links to it. */
export function issueOfWorkspace(key: string): Issue | undefined {
  return issueList.find((issue) => issue.workspaces.includes(key))
}
