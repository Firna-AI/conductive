import { HttpError } from '../http'

export function featureWorkspaceId(path: string): string | null {
  const match = path.match(
    /^\/api\/orgs\/[^/]+\/workspaces\/([^/]+)\/(?:files\/(?:tree|content|download)|changes(?:\/diff)?|terminal(?:\/socket)?|previews(?:\/[^/]+)?|desktop|github(?:\/checks)?)$/,
  )
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  }
}
