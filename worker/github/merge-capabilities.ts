import type {
  GitHubCapabilities,
  GitHubMergeMethod,
} from '../../src/shared/github'
import type { HttpFetch } from '../env'
import type { GitHubWorkspace } from './contracts'
import { choice, flag, githubFailure, integer, object } from './parsers'
import { graphql } from './transport'

const CAPABILITIES = `query MergeCapabilities($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    databaseId viewerPermission viewerDefaultMergeMethod
    mergeCommitAllowed squashMergeAllowed rebaseMergeAllowed
  }
}`

const repositoryPermissions = [
  'READ',
  'TRIAGE',
  'MODERATE',
  'TRIAGE_PLUS',
  'WRITE',
  'MAINTAIN',
  'ADMIN',
] as const
export type RepositoryPermission = (typeof repositoryPermissions)[number]

interface RepositoryMergeCapabilities extends GitHubCapabilities {
  allowedMethods: readonly GitHubMergeMethod[]
}

export async function readMergeCapabilities(
  fetch: HttpFetch,
  token: string,
  workspace: GitHubWorkspace,
): Promise<RepositoryMergeCapabilities> {
  const [owner, name] = workspace.fullName.split('/')
  const result = await graphql(fetch, token, CAPABILITIES, { owner, name })
  const repository = object(result.repository)
  if (integer(repository.databaseId) !== workspace.repositoryId)
    throw githubFailure()
  const permission = choice(repository.viewerPermission, repositoryPermissions)
  const canWrite = ['WRITE', 'MAINTAIN', 'ADMIN'].includes(permission)
  const preferred = choice(repository.viewerDefaultMergeMethod, [
    'MERGE',
    'SQUASH',
    'REBASE',
  ])
  const methods: readonly [GitHubMergeMethod, boolean][] = [
    ['merge', flag(repository.mergeCommitAllowed)],
    ['squash', flag(repository.squashMergeAllowed)],
    ['rebase', flag(repository.rebaseMergeAllowed)],
  ]
  const allowedMethods = methods
    .filter(([, allowed]) => allowed)
    .map(([method]) => method)
  const mergeMethod = canWrite
    ? (allowedMethods.find((method) => method.toUpperCase() === preferred) ??
      allowedMethods[0] ??
      null)
    : null
  return { canWrite, mergeMethod, allowedMethods }
}
