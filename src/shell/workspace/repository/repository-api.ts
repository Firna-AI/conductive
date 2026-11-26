import type { ApiClient } from '../../../app/api/client'
import {
  count,
  maybeNested,
  nested,
  ParseError,
  record,
  text,
  texts,
} from '../../../app/api/parse'
import { readWorkspace } from '../../../app/api/read-workspaces'
import type { WorkspaceIdentity } from '../../../app/workspace-store'
import { fileLabels, readLocalWork } from '../../../github/continueActions'
import {
  workspacePaths,
  type ChangeRepositoryRequest,
  type ChangeRepositoryResponse,
  type RepositoryChangeWork,
} from '../../../shared/workspaces'

function readPullRequest(value: unknown): { number: number; url: string } {
  const body = record(value, 'pull request')
  return { number: count(body, 'number'), url: text(body, 'url') }
}

/**
 * Checks the work that the question of a repository change lists. Each path
 * stays the real path, and the optional labels of the changed files, which
 * hide each secret value, never make it unreadable.
 */
function readWork(value: unknown): RepositoryChangeWork {
  const body = record(value, 'repository change work')
  const carriedFiles = texts(body, 'carriedFiles')
  const displayCarriedFiles = fileLabels(body.displayCarriedFiles, carriedFiles)
  return {
    localWork: nested(body, 'localWork', readLocalWork),
    pullRequest: maybeNested(body, 'pullRequest', readPullRequest),
    pushedCommits: count(body, 'pushedCommits'),
    carriedFiles,
    ...(displayCarriedFiles === undefined ? {} : { displayCarriedFiles }),
  }
}

function readRepository(value: unknown): { id: string; fullName: string } {
  const body = record(value, 'repository')
  return { id: text(body, 'id'), fullName: text(body, 'fullName') }
}

/** Checks a reply of the repository change routes against the contract. */
function readChangeRepositoryResponse(
  value: unknown,
): ChangeRepositoryResponse {
  const reply = record(value, 'repository change reply')
  switch (reply.state) {
    case 'pending':
      return { state: 'pending', changeId: text(reply, 'changeId') }
    case 'confirmation-required':
      return {
        state: 'confirmation-required',
        repository: nested(reply, 'repository', readRepository),
        branch: text(reply, 'branch'),
        baseBranch: text(reply, 'baseBranch'),
        work: nested(reply, 'work', readWork),
      }
    case 'changed':
      return {
        state: 'changed',
        workspace: nested(reply, 'workspace', readWorkspace),
        eventNumber: count(reply, 'eventNumber'),
      }
    default:
      throw new ParseError('The repository change reply has no known state.')
  }
}

/**
 * The requests of a repository change for one workspace, over the JSON
 * client of the org, so a refusal of a suspended org marks the org. A
 * refusal throws the `ApiError` of the client, with the app's code and safe
 * message.
 */
export function createRepositoryActions(
  api: ApiClient,
  target: WorkspaceIdentity,
) {
  const { orgId, workspaceId } = target
  return {
    start: (body: ChangeRepositoryRequest) =>
      api.send(
        'POST',
        workspacePaths.repository(orgId, workspaceId),
        body,
        readChangeRepositoryResponse,
      ),
    result: (changeId: string) =>
      api.get(
        workspacePaths.repositoryResult(orgId, workspaceId, changeId),
        readChangeRepositoryResponse,
      ),
  }
}

export type RepositoryActions = ReturnType<typeof createRepositoryActions>
