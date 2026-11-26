import { HttpError } from '../http'
import {
  FIRST_TERMINAL_ID,
  TERMINAL_ID_PATTERN,
} from '../../src/shared/terminal'

const featurePath = new RegExp(
  `^/api/orgs/[^/]+/workspaces/([^/]+)/(?:services(?:/(?:control|logs))?|files/(?:tree|content|download)|skills/content|changes(?:/diff)?|terminal(?:/socket|/terminals(?:/[^/]+/socket|/(?:${FIRST_TERMINAL_ID}|${TERMINAL_ID_PATTERN}))?)?|previews(?:/[^/]+)?|desktop|github(?:/(?:checks|stored|capabilities|ready|merge(?:/[^/]+)?))?)$`,
)

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
