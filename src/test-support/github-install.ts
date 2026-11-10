import {
  GITHUB_INSTALL_PATH,
  GITHUB_INSTALL_SCREEN,
} from '../shared/github-setup'

const origin = 'https://app.test'

/**
 * The screen that a link names for the return from GitHub, or null for a
 * link that does not start an install of the GitHub App at the Worker.
 */
export function installStartScreen(link: string): string | null {
  const url = new URL(link, origin)
  if (url.origin !== origin || url.pathname !== GITHUB_INSTALL_PATH) return null
  return url.searchParams.get(GITHUB_INSTALL_SCREEN)
}
