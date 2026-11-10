import type { ApiClient } from '../app/api/client'
import { count, nested, ParseError, record, text } from '../app/api/parse'
import { readArchiveCheck, readWorkspace } from '../app/api/read-workspaces'
import {
  workspacePaths,
  type ContinueWorkspaceRequest,
  type ContinueWorkspaceResponse,
} from '../shared/workspaces'
import type { WorkspaceTarget } from './githubClient'

/** Checks a reply of the Continue routes against the contract. */
function readContinueResponse(value: unknown): ContinueWorkspaceResponse {
  const reply = record(value, 'Continue reply')
  switch (reply.state) {
    case 'pending':
      return { state: 'pending', continueId: text(reply, 'continueId') }
    case 'confirmation-required':
      return {
        state: 'confirmation-required',
        branch: text(reply, 'branch'),
        baseBranch: text(reply, 'baseBranch'),
        localWork: nested(reply, 'localWork', readArchiveCheck),
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
