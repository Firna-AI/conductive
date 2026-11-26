import type { GitHubCapabilities } from '../../src/shared/github'
import type { GitHubMergeMethod } from '../../src/shared/generated/GitHubMergeMethod'
import type { HttpFetch } from '../env'
import { readBoundedJson } from '../http/bounded-body'
import { reconnectRequired } from '../security/github-tokens'
import type { GitHubWorkspace } from './contracts'
import { choice, flag, githubFailure, integer, nodes, object } from './parsers'
import {
  GITHUB_API_BODY_BYTES,
  githubRequest,
  graphql,
  withGitHubResponse,
} from './transport'

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

function repositoryVariables(fullName: string) {
  const [owner, name] = fullName.split('/')
  return { owner, name }
}

function repositoryCanWrite(repository: Record<string, unknown>) {
  const permission = choice(repository.viewerPermission, repositoryPermissions)
  return ['WRITE', 'MAINTAIN', 'ADMIN'].includes(permission)
}

export async function readMergeCapabilities(
  fetch: HttpFetch,
  token: string,
  workspace: Pick<GitHubWorkspace, 'repositoryId' | 'fullName'>,
): Promise<RepositoryMergeCapabilities> {
  const result = await graphql(
    fetch,
    token,
    CAPABILITIES,
    repositoryVariables(workspace.fullName),
  )
  const repository = object(result.repository)
  return mergeCapabilities(repository, workspace.repositoryId)
}

function mergeCapabilities(
  repository: Record<string, unknown>,
  repositoryId: number,
): RepositoryMergeCapabilities {
  if (integer(repository.databaseId) !== repositoryId) throw githubFailure()
  const canWrite = repositoryCanWrite(repository)
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

/** A queued member can lose all access to a private repository. */
async function accessibleQueueRepository(
  fetch: HttpFetch,
  token: string,
  workspace: Pick<GitHubWorkspace, 'repositoryId' | 'fullName'>,
) {
  const result = await withGitHubResponse(
    fetch,
    githubRequest('/graphql', token, {
      method: 'POST',
      body: JSON.stringify({
        query: CAPABILITIES,
        variables: repositoryVariables(workspace.fullName),
      }),
    }),
    async (response) => {
      if (!response.ok) {
        void response.body?.cancel().catch(() => undefined)
        if (response.status === 401) return null
        throw githubFailure()
      }
      return object(await readBoundedJson(response.body, GITHUB_API_BODY_BYTES))
    },
  ).catch(() => {
    throw githubFailure()
  })
  if (result === null) throw reconnectRequired()
  const repository = object(result.data).repository
  if (
    repository === null &&
    (result.errors === undefined ||
      nodes(result.errors).every((error) => object(error).type === 'NOT_FOUND'))
  )
    return null
  if (result.errors !== undefined) throw githubFailure()
  const checked = object(repository)
  if (integer(checked.databaseId) !== workspace.repositoryId)
    throw githubFailure()
  return checked.viewerPermission === null ? null : checked
}

export async function readQueueWriteAccess(
  fetch: HttpFetch,
  token: string,
  workspace: Pick<GitHubWorkspace, 'repositoryId' | 'fullName'>,
): Promise<boolean> {
  const repository = await accessibleQueueRepository(fetch, token, workspace)
  return repository !== null && repositoryCanWrite(repository)
}

export async function readQueueCapabilities(
  fetch: HttpFetch,
  token: string,
  workspace: Pick<GitHubWorkspace, 'repositoryId' | 'fullName'>,
): Promise<RepositoryMergeCapabilities | null> {
  const repository = await accessibleQueueRepository(fetch, token, workspace)
  return repository && mergeCapabilities(repository, workspace.repositoryId)
}
