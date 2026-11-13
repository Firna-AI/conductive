import type { AgentListWorkspacesRequest } from '../../src/shared/agent-workspaces'
import { workspaceState } from '../../tools/responses'
import { HttpError } from '../http'

function invalid(): never {
  throw new HttpError(
    400,
    'invalid_input',
    'Check the workspace filters and try again.',
  )
}

function counter(value: string): number {
  if (!/^\d+$/.test(value)) return invalid()
  return timestamp(value)
}

function timestamp(value: string): number {
  if (!/^[+-]?\d+$/.test(value)) return invalid()
  const result = Number(value)
  return Number.isSafeInteger(result) ? result : invalid()
}

export function workspaceListInput(
  query: URLSearchParams,
): AgentListWorkspacesRequest {
  const ownerId = query.get('ownerId')
  const state = query.get('state')
  const repositoryId = query.get('repositoryId')
  const name = query.get('query')
  const updatedSince = query.get('updatedSince')
  const archived = query.get('archived')
  const removed = query.get('removed')
  const limit = query.get('limit')
  const offset = query.get('offset')
  if (archived !== null && archived !== 'true' && archived !== 'false')
    return invalid()
  if (removed !== null && removed !== 'true' && removed !== 'false')
    return invalid()
  if (limit !== null && (counter(limit) < 1 || counter(limit) > 100))
    return invalid()
  if (ownerId === '' || repositoryId === '') return invalid()
  try {
    return {
      ...(ownerId !== null && { ownerId }),
      ...(state !== null && { state: workspaceState(state) }),
      ...(repositoryId !== null && { repositoryId }),
      ...(name?.trim() && { query: name.trim() }),
      ...(updatedSince !== null && { updatedSince: timestamp(updatedSince) }),
      ...(archived !== null && { archived: archived === 'true' }),
      ...(removed !== null && { removed: removed === 'true' }),
      ...(limit !== null && { limit: counter(limit) }),
      ...(offset !== null && { offset: counter(offset) }),
    }
  } catch {
    return invalid()
  }
}
