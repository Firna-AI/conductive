import type { BrowserRegistration } from './browser-tabs'

export function browserRegistration(
  value: unknown,
): BrowserRegistration | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('identity' in value) ||
    typeof value.identity !== 'object' ||
    value.identity === null ||
    !('deadline' in value) ||
    typeof value.deadline !== 'number' ||
    !('checkAt' in value) ||
    typeof value.checkAt !== 'number'
  )
    return null
  const identity = value.identity
  if (
    !('kind' in identity) ||
    identity.kind !== 'workspace' ||
    !('workspaceId' in identity) ||
    typeof identity.workspaceId !== 'string' ||
    !('orgId' in identity) ||
    typeof identity.orgId !== 'string' ||
    !('userId' in identity) ||
    typeof identity.userId !== 'string' ||
    !('sessionId' in identity) ||
    typeof identity.sessionId !== 'string'
  )
    return null
  if (
    'tabId' in value &&
    value.tabId !== undefined &&
    typeof value.tabId !== 'string'
  )
    return null
  return {
    identity: {
      kind: 'workspace',
      workspaceId: identity.workspaceId,
      orgId: identity.orgId,
      userId: identity.userId,
      sessionId: identity.sessionId,
    },
    deadline: value.deadline,
    checkAt: value.checkAt,
    ...('tabId' in value &&
      typeof value.tabId === 'string' && { tabId: value.tabId }),
  }
}
