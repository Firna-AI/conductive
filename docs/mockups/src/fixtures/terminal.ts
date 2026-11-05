/**
 * Terminal sessions. Each line is a list of coloured segments.
 */

export type TerminalTone = 'prompt' | 'plain' | 'muted' | 'success' | 'accent'

export type TerminalSegment = { text: string; tone: TerminalTone }

export type TerminalLine = readonly TerminalSegment[]

function prompt(location: string, command: string): TerminalLine {
  return [
    { text: `${location} $ `, tone: 'prompt' },
    { text: command, tone: 'plain' },
  ]
}

function plain(text: string): TerminalLine {
  return [{ text, tone: 'plain' }]
}

function muted(text: string): TerminalLine {
  return [{ text, tone: 'muted' }]
}

function success(text: string): TerminalLine {
  return [{ text, tone: 'success' }]
}

const workspaceLocation = 'storefront (cal/checkout-autocomplete)'

/** The dev server in the open workspace. */
export const workspaceSession: readonly TerminalLine[] = [
  prompt(workspaceLocation, 'npm run dev'),
  plain(''),
  muted('> storefront@2.4.0 dev'),
  muted('> next dev --turbopack'),
  plain(''),
  [{ text: '   ▲ Next.js 16.0.1', tone: 'accent' }],
  plain('   - Local:   http://localhost:3000'),
  plain(''),
  success(' ✓ Ready in 1.8s'),
  plain(' ○ Compiling /checkout ...'),
  success(' ✓ Compiled /checkout in 2.1s'),
  plain(' GET /checkout 200 in 2304ms'),
  plain(' GET /api/places?q=221b%20baker 200 in 184ms'),
  plain(' GET /api/places?q=221b%20baker%20st 200 in 162ms'),
]

const baseLocation = 'storefront (main)'

/** Installing software on the base of a repository. */
export const baseSession: readonly TerminalLine[] = [
  prompt(baseLocation, 'sudo apt-get install -y postgresql-client-16'),
  plain('Reading package lists... Done'),
  plain('Building dependency tree... Done'),
  plain('The following NEW packages will be installed:'),
  plain('  postgresql-client-16 postgresql-client-common'),
  plain('Setting up postgresql-client-common (262.pgdg24.04+1) ...'),
  plain('Setting up postgresql-client-16 (16.4-1.pgdg24.04+1) ...'),
  prompt(baseLocation, 'psql --version'),
  plain('psql (PostgreSQL) 16.4'),
]

export const baseSessionPrompt = `${baseLocation} $ `

export const workspaceSessionPrompt = `${workspaceLocation} $ `

/** A new workspace: the terminal waits at its first prompt. */
export const freshSessionPrompt = 'storefront (cal/saved-carts) $ '
