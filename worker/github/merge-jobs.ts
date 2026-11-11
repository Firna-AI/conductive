import type { GitHubMergeMethod } from '../../src/shared/github'
import type { GitHubWorkspace } from './contracts'
import type { MergeStorage } from './merge-handler'
import { choice, integer, object, text } from './parsers'
import { mergeUnavailable } from './merge-errors'

interface MergeJob {
  userId: string
  workspaceId: string
  repositoryId: number
  installationId: number
  branch: string
  fullName: string
  pullNumber: number
  headSha: string
  method: GitHubMergeMethod
  uuid: string
}

const key = (id: string) => `github-merge:${id}`

export function saveMergeJob(storage: MergeStorage, id: string, job: MergeJob) {
  return storage.put(key(id), job)
}

export async function readMergeJob(
  storage: MergeStorage,
  id: string,
  workspace: GitHubWorkspace,
  userId: string,
): Promise<MergeJob> {
  const value = await storage.get(key(id))
  if (value === undefined) throw mergeUnavailable()
  const input = object(value)
  if (
    input.userId !== userId ||
    input.workspaceId !== workspace.id ||
    input.repositoryId !== workspace.repositoryId ||
    input.installationId !== workspace.installationId ||
    input.branch !== workspace.branch
  )
    throw mergeUnavailable()
  return {
    userId: text(input.userId),
    workspaceId: text(input.workspaceId),
    repositoryId: integer(input.repositoryId),
    installationId: integer(input.installationId),
    branch: text(input.branch),
    fullName: text(input.fullName),
    pullNumber: integer(input.pullNumber),
    headSha: text(input.headSha),
    method: choice(input.method, ['merge', 'squash', 'rebase']),
    uuid: text(input.uuid),
  }
}
