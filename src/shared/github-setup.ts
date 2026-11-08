/**
 * The address where GitHub sends the user after an install of the GitHub
 * App, or after a change of an install. It is the Setup URL of the GitHub
 * App, on the app origin.
 */
export const GITHUB_SETUP_PATH = '/github/setup'

/**
 * Where an install starts: Get started or Account in a browser, or either
 * screen in the Mac app. The install link carries it to GitHub as `state`,
 * and GitHub gives it back to the Setup URL.
 */
export const GITHUB_INSTALL_SOURCES = ['get-started', 'account', 'mac'] as const

export type GitHubInstallSource = (typeof GITHUB_INSTALL_SOURCES)[number]

/** The screen that opens again after an install that started in a browser. */
export const GITHUB_SETUP_RETURNS: Readonly<
  Record<Exclude<GitHubInstallSource, 'mac'>, string>
> = {
  'get-started': '/get-started',
  account: '/account',
}

/** The install link of the API, with the place where the install starts. */
export function githubInstallLink(
  installUrl: string,
  source: GitHubInstallSource,
): string {
  const url = new URL(installUrl)
  url.searchParams.set('state', source)
  return url.href
}

/** The place where an install started, from `state`, or null for another value. */
export function githubInstallSource(
  state: string | null,
): GitHubInstallSource | null {
  return GITHUB_INSTALL_SOURCES.find((source) => source === state) ?? null
}
