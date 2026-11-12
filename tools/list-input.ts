import type { AgentListSessionsRequest } from '../src/shared/agent-sessions.ts'
import type { AgentListWorkspacesRequest } from '../src/shared/agent-workspaces.ts'
import { record, text, ToolInputError } from './input.ts'
import { workspaceState } from './responses.ts'

function integer(value: unknown, minimum?: number, maximum?: number): number {
  if (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    (minimum === undefined || value >= minimum) &&
    (maximum === undefined || value <= maximum)
  )
    return value
  throw new ToolInputError('Check the list options. Use --help for details.')
}

export function listSessionsInput(value: unknown): AgentListSessionsRequest {
  const fields = record(value)
  return {
    ...(fields.limit !== undefined && { limit: integer(fields.limit, 1, 100) }),
    ...(fields.offset !== undefined && { offset: integer(fields.offset, 0) }),
  }
}

export function listWorkspacesInput(
  value: unknown,
): AgentListWorkspacesRequest {
  const fields = record(value)
  if (fields.archived !== undefined && typeof fields.archived !== 'boolean')
    throw new ToolInputError('Choose true or false for archived workspaces.')
  if (fields.query !== undefined && typeof fields.query !== 'string')
    throw new ToolInputError('Use text for the workspace name filter.')
  return {
    ...listSessionsInput(fields),
    ...(fields.ownerId !== undefined && { ownerId: text(fields.ownerId) }),
    ...(fields.state !== undefined && { state: workspaceState(fields.state) }),
    ...(fields.repositoryId !== undefined && {
      repositoryId: text(fields.repositoryId),
    }),
    ...(typeof fields.query === 'string' && { query: fields.query }),
    ...(fields.updatedSince !== undefined && {
      updatedSince: integer(fields.updatedSince),
    }),
    ...(fields.archived !== undefined && { archived: fields.archived }),
  }
}
