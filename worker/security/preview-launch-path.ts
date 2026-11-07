import { API_PATHS } from '../../src/shared/api.js'

export const PREVIEW_HANDOFF_PATH = '/.conductive/authorize'

/** Only the existing single-preview GET route can select a navigation cookie. */
export function isPreviewLaunchPath(path: string): boolean {
  const match = new RegExp(
    `^${API_PATHS.orgs}/([^/]+)/workspaces/([^/]+)/previews/([^/]+)$`,
  ).exec(path)
  if (!match) return false
  try {
    return match.slice(1).every((part) => decodeURIComponent(part).length > 0)
  } catch {
    return false
  }
}
