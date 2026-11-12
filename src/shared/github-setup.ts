/**
 * The address where GitHub sends the user after an install of the GitHub
 * App, or after a change of an install. It is the Setup URL of the GitHub
 * App, on the app origin.
 */
export const GITHUB_SETUP_PATH = '/github/setup'

/**
 * The address where a browser starts an install or a change of the GitHub
 * App, on the app origin. The Worker keeps the screen of the query in a
 * cookie, then sends the browser to the install page of the GitHub App.
 * Reason: GitHub drops `state` when the user changes an install that
 * exists, so only the browser can carry the screen to the return.
 */
export const GITHUB_INSTALL_PATH = '/github/install'

/** The query parameter of the start address that names the screen. */
export const GITHUB_INSTALL_SCREEN = 'from'

/** The `state` that names an install from the Mac app. */
const MAC_STATE = 'mac'

/**
 * Where an install or a change of the GitHub App starts: a screen of the
 * app in a browser, by its path and query, or the Mac app with the install
 * page of the API.
 */
export type GitHubInstallStart =
  { kind: 'browser'; screen: string } | { kind: 'mac'; installUrl: string }

/**
 * The link that starts an install or a change of the GitHub App. A browser
 * starts at the Worker. The Mac app opens GitHub in the default browser,
 * which has none of its cookies, so its link goes to GitHub and names the
 * Mac app in `state`. GitHub gives `state` back after an install.
 */
export function githubInstallLink(start: GitHubInstallStart): string {
  if (start.kind === 'browser') {
    const query = new URLSearchParams({ [GITHUB_INSTALL_SCREEN]: start.screen })
    return `${GITHUB_INSTALL_PATH}?${query}`
  }
  const url = new URL(start.installUrl)
  url.searchParams.set('state', MAC_STATE)
  return url.href
}

/** Whether the `state` of a return names an install from the Mac app. */
export function isMacInstall(state: string | null): boolean {
  return state === MAC_STATE
}
