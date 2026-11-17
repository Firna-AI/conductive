import type {
  UpdateWorkspaceCapabilitiesRequest,
  WorkspaceCapabilities,
} from '../../src/shared/secrets'
import { HttpError, isRecord } from '../http'

function invalid() {
  return new HttpError(400, 'invalid_input', 'Complete the required fields.')
}

export function readCapabilitiesChange(
  value: unknown,
): UpdateWorkspaceCapabilitiesRequest {
  if (!isRecord(value)) throw invalid()
  const macAccess = value.macAccess
  if (macAccess !== undefined && typeof macAccess !== 'boolean') throw invalid()
  const preapprovedSecretIds = value.preapprovedSecretIds
  if (
    preapprovedSecretIds !== undefined &&
    !Array.isArray(preapprovedSecretIds)
  )
    throw invalid()
  const ids = preapprovedSecretIds?.map((id: unknown) => {
    if (typeof id !== 'string') throw invalid()
    return id
  })
  const removals = value.removeSessionApprovals
  if (removals !== undefined && !Array.isArray(removals)) throw invalid()
  const removeSessionApprovals = removals?.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.secretId !== 'string' ||
      typeof item.sessionId !== 'string'
    )
      throw invalid()
    return { secretId: item.secretId, sessionId: item.sessionId }
  })
  return {
    macAccess,
    preapprovedSecretIds: ids === undefined ? undefined : [...new Set(ids)],
    removeSessionApprovals,
  }
}

export function readCreationCapabilities(
  value: unknown,
): WorkspaceCapabilities {
  const change =
    value === undefined || value === null ? {} : readCapabilitiesChange(value)
  return {
    preapprovedSecretIds: change.preapprovedSecretIds ?? [],
    macAccess: change.macAccess ?? true,
  }
}
