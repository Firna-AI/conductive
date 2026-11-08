import { workspacesPath } from '../../src/shared/workspaces'
import { HttpError } from '../http'

export function workspaceChildId(path: string, orgId: string): string | null {
  const prefix = `${workspacesPath(orgId)}/`
  if (!path.startsWith(prefix)) return null
  const encoded = path.slice(prefix.length).split('/')[0]
  if (!encoded) return null
  try {
    return decodeURIComponent(encoded)
  } catch {
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  }
}
