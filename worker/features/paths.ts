import { HttpError } from '../http'

const featurePath =
  /^\/api\/orgs\/[^/]+\/workspaces\/([^/]+)\/(?:files\/(?:tree|content|download)|changes(?:\/diff)?|terminal(?:\/socket)?|previews(?:\/[^/]+)?|desktop|github(?:\/(?:checks|stored|capabilities|merge(?:\/[^/]+)?))?)$/

export function isFeatureWorkspacePath(path: string): boolean {
  return featurePath.test(path)
}

export function featureWorkspaceId(path: string): string | null {
  const match = path.match(featurePath)
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
