/**
 * The repositories of an org. The cloud computer of the org holds every
 * one of them.
 */

export const repositoryKeys = [
  'storefront',
  'billing-service',
  'marketing-site',
] as const

export type RepositoryKey = (typeof repositoryKeys)[number]

export type Repository = {
  key: RepositoryKey
  name: string
  defaultBranch: string
}

export const repositories: Readonly<Record<RepositoryKey, Repository>> = {
  storefront: {
    key: 'storefront',
    name: 'acme/storefront',
    defaultBranch: 'main',
  },
  'billing-service': {
    key: 'billing-service',
    name: 'acme/billing-service',
    defaultBranch: 'main',
  },
  'marketing-site': {
    key: 'marketing-site',
    name: 'acme/marketing-site',
    defaultBranch: 'main',
  },
}

/** A repository that the shared GitHub App can reach. */
export type ReachableRepository = {
  name: string
  description: string
  /** The org uses it, so its workspaces can start in it. */
  used: boolean
}

/** The repositories that Acme uses, then the others that it can add. */
export const acmeRepositories: readonly ReachableRepository[] = [
  { name: 'acme/storefront', description: 'The online shop', used: true },
  {
    name: 'acme/billing-service',
    description: 'Invoices, payments, and webhooks',
    used: true,
  },
  {
    name: 'acme/marketing-site',
    description: 'The public website',
    used: true,
  },
  {
    name: 'acme/admin-dashboard',
    description: 'Internal tools for orders and refunds',
    used: false,
  },
  {
    name: 'acme/mobile-app',
    description: 'The iOS and Android shop app',
    used: false,
  },
  {
    name: 'acme/data-pipeline',
    description: 'Nightly stock and price imports',
    used: false,
  },
]

/** The org that the create screen makes, and its repositories. */
export const newOrg = {
  name: 'Firna',
  initials: 'FI',
  search: 'firna',
  repositories: [
    {
      name: 'firna/components',
      description: 'Shared React components',
      used: true,
    },
    { name: 'firna/docs', description: 'The documentation site', used: true },
    { name: 'firna/icons', description: 'The icon set', used: false },
  ],
} as const

/** Another org that Create org makes beside the user's orgs. */
export const anotherOrg = {
  name: 'Acme Labs',
  initials: 'AL',
  search: 'acme',
  repositories: [
    {
      name: 'acme/mobile-app',
      description: 'The iOS and Android shop app',
      used: true,
    },
    {
      name: 'acme/data-pipeline',
      description: 'Nightly stock and price imports',
      used: true,
    },
    {
      name: 'acme/admin-dashboard',
      description: 'Internal tools for orders and refunds',
      used: false,
    },
  ],
} as const
