import type { ApiClient } from '../app/api/client'
import {
  count,
  nested,
  ParseError,
  record,
  text,
  texts,
} from '../app/api/parse'
import { readWorkspace } from '../app/api/read-workspaces'
import {
  workspacePaths,
  type ContinueWorkspaceRequest,
  type ContinueWorkspaceResponse,
  type LocalWork,
} from '../shared/workspaces'
import type { WorkspaceTarget } from './githubClient'

/** A display label, or nothing. A label never makes a reply unreadable. */
function label(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/**
 * The label of each changed file, in the order of the real paths, or
 * nothing. A list that does not match the paths one to one gives nothing,
 * and an item that is not a label gives its real path.
 */
export function fileLabels(
  value: unknown,
  paths: readonly string[],
): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length !== paths.length) return undefined
  const labels: readonly unknown[] = value
  return paths.map((path, index) => label(labels[index]) ?? path)
}

/**
 * Checks the local work that the question of Continue lists, and the
 * question of a repository change. Each path stays the real path, and the
 * optional labels, which hide each secret value, never make it unreadable.
 */
export function readLocalWork(value: unknown): LocalWork {
  const body = record(value, 'local work')
  const uncommittedFiles = texts(body, 'uncommittedFiles')
  const displayUncommittedFiles = fileLabels(
    body.displayUncommittedFiles,
    uncommittedFiles,
  )
  return {
    uncommittedFiles,
    ...(displayUncommittedFiles === undefined
      ? {}
      : { displayUncommittedFiles }),
    unpushedCommits: count(body, 'unpushedCommits'),
  }
}

/** Checks a reply of the Continue routes against the contract. */
function readContinueResponse(value: unknown): ContinueWorkspaceResponse {
  const reply = record(value, 'Continue reply')
  switch (reply.state) {
    case 'pending':
      return { state: 'pending', continueId: text(reply, 'continueId') }
    case 'confirmation-required': {
      const displayBaseBranch = label(reply.displayBaseBranch)
      return {
        state: 'confirmation-required',
        branch: text(reply, 'branch'),
        baseBranch: text(reply, 'baseBranch'),
        ...(displayBaseBranch === undefined ? {} : { displayBaseBranch }),
        localWork: nested(reply, 'localWork', readLocalWork),
      }
    }
    case 'continued':
      return {
        state: 'continued',
        workspace: nested(reply, 'workspace', readWorkspace),
        eventNumber: count(reply, 'eventNumber'),
      }
    default:
      throw new ParseError('The Continue reply has no known state.')
  }
}

/**
 * The requests of Continue for one workspace, over the JSON client of the
 * org, so a refusal of a suspended org marks the org. A refusal throws the
 * `ApiError` of the client, with the app's code and safe message.
 */
export function createContinueActions(api: ApiClient, target: WorkspaceTarget) {
  const { orgId, workspaceId } = target
  return {
    start: (body: ContinueWorkspaceRequest) =>
      api.send(
        'POST',
        workspacePaths.continue(orgId, workspaceId),
        body,
        readContinueResponse,
      ),
    result: (continueId: string) =>
      api.get(
        workspacePaths.continueResult(orgId, workspaceId, continueId),
        readContinueResponse,
      ),
  }
}

export type ContinueActions = ReturnType<typeof createContinueActions>
