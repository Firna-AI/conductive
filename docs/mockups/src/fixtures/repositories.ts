/**
 * The repositories of an org. The cloud computer of the org holds every
 * one of them.
 */

export type RepositoryKey = 'storefront' | 'billing-service' | 'marketing-site'

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

/**
 * The repository that an admin of Acme adds. It waits until a build clones
 * it into the cloud computer of Acme.
 */
export const addedRepository = 'acme/admin-dashboard'

/**
 * The repository that an admin of Acme removes. The cloud computer of Acme
 * holds it until the next build.
 */
export const removedRepository = 'acme/marketing-site'

/**
 * The saved repository changes of Acme that its cloud computer does not
 * hold yet: none, the added repository, the removed one, or both.
 */
export const repositoryChanges = ['none', 'added', 'removed', 'both'] as const

export type RepositoryChange = (typeof repositoryChanges)[number]

/** The repositories that a change adds and removes. */
export function changedNames(change: RepositoryChange): {
  added: readonly string[]
  removed: readonly string[]
} {
  const adds = change === 'added' || change === 'both'
  const removes = change === 'removed' || change === 'both'
  return {
    added: adds ? [addedRepository] : [],
    removed: removes ? [removedRepository] : [],
  }
}

/** The repositories of Acme after a change, as the Repositories tab lists them. */
export function changedAcmeRepositories(
  change: RepositoryChange,
): readonly ReachableRepository[] {
  const { added, removed } = changedNames(change)
  return acmeRepositories.map((repository) => {
    if (added.includes(repository.name)) return { ...repository, used: true }
    if (removed.includes(repository.name)) {
      return { ...repository, used: false }
    }
    return repository
  })
}

/** The task of a kept draft in the added repository. */
export const addedRepositoryDraft =
  'Add a filter for the refund reason to the orders table.'

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

/** The task that Cal types for the first workspace of Firna. */
export const newOrgDraft =
  'Add a loading state to the Button component, with a spinner and tests.'

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
