/**
 * The repositories that the user added, and the settings of their bases.
 * A base is the prepared sandbox that new workspaces of a repository start
 * from.
 */

export const repositoryKeys = [
  'storefront',
  'billing-service',
  'marketing-site',
] as const

export type RepositoryKey = (typeof repositoryKeys)[number]

export type BaseStatus = 'ready' | 'updating' | 'failed'

export type Repository = {
  key: RepositoryKey
  name: string
  defaultBranch: string
  base: BaseStatus
  /** When the newest good base was saved. */
  baseUpdated: string
  /** The commit of the default branch in the newest good base. */
  baseCommit: string
}

export const repositories: Readonly<Record<RepositoryKey, Repository>> = {
  storefront: {
    key: 'storefront',
    name: 'acme/storefront',
    defaultBranch: 'main',
    base: 'ready',
    baseUpdated: '18 minutes ago',
    baseCommit: '4f2c9a1',
  },
  'billing-service': {
    key: 'billing-service',
    name: 'acme/billing-service',
    defaultBranch: 'main',
    base: 'updating',
    baseUpdated: '1 hour ago',
    baseCommit: 'b81d0e4',
  },
  'marketing-site': {
    key: 'marketing-site',
    name: 'acme/marketing-site',
    defaultBranch: 'main',
    base: 'ready',
    baseUpdated: '3 hours ago',
    baseCommit: '07ac5f2',
  },
}

export const startupScript = `#!/usr/bin/env bash
set -euo pipefail

npm ci
npx prisma generate
npx playwright install chromium`

export type EnvVar = { name: string }

export const envVars: readonly EnvVar[] = [
  { name: 'DATABASE_URL' },
  { name: 'PLACES_API_KEY' },
  { name: 'STRIPE_SECRET_KEY' },
  { name: 'NEXT_PUBLIC_SITE_URL' },
]

/** The steps of a base update, in order. */
export const baseUpdateSteps = [
  { label: 'Resumed the base', state: 'done' },
  { label: 'Fetched main at 9c1e2b7', state: 'done' },
  { label: 'Running the startup script', state: 'running' },
  { label: 'Saving the base', state: 'waiting' },
] as const

/** The last lines of the startup script output of a failed update. */
export const failedUpdateOutput = `npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
npm error peer react@"^18.0.0" from react-day-picker@8.10.1
npm error Fix the upstream dependency conflict and try again.`

/** Repositories on GitHub that the user can add. */
export const addableRepositories = [
  {
    name: 'acme/admin-dashboard',
    description: 'Internal tools for orders and refunds',
  },
  { name: 'acme/mobile-app', description: 'The iOS and Android shop app' },
  {
    name: 'acme/data-pipeline',
    description: 'Nightly stock and price imports',
  },
] as const
