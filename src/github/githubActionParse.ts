import type {
  GitHubCapabilities,
  GitHubMergeMethod,
  GitHubMergeResponse,
} from '../shared/github'

function isActionRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function actionRecord(value: unknown): Record<string, unknown> | null {
  return isActionRecord(value) ? value : null
}

function isMergeMethod(value: unknown): value is GitHubMergeMethod {
  return value === 'merge' || value === 'squash' || value === 'rebase'
}

export function readCapabilities(value: unknown): GitHubCapabilities | null {
  const input = actionRecord(value)
  if (
    !input ||
    typeof input.canWrite !== 'boolean' ||
    (input.mergeMethod !== null && !isMergeMethod(input.mergeMethod))
  )
    return null
  return { canWrite: input.canWrite, mergeMethod: input.mergeMethod }
}

export function readMergeResponse(value: unknown): GitHubMergeResponse | null {
  const input = actionRecord(value)
  if (input?.state === 'merged') return { state: 'merged' }
  if (
    input?.state === 'pending' &&
    typeof input.mergeId === 'string' &&
    input.mergeId
  )
    return { state: 'pending', mergeId: input.mergeId }
  return null
}
