/**
 * Terminal sessions. Each line is a list of coloured segments.
 */

import { timedOutBuild } from './computer'
import { checkoutAutocomplete, savedCarts } from './workspaces'

export type TerminalTone =
  'prompt' | 'plain' | 'muted' | 'success' | 'accent' | 'error'

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

const workspaceLocation = `storefront (${checkoutAutocomplete.branch})`

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

function error(text: string): TerminalLine {
  return [{ text, tone: 'error' }]
}

/** A build of the cloud computer while it runs: the newest lines. */
export const buildLog: readonly TerminalLine[] = [
  muted('Cloning 3 repositories into ~/code'),
  success(' ✓ acme/storefront at 4f2c9a1'),
  success(' ✓ acme/billing-service at b81d0e4'),
  success(' ✓ acme/marketing-site at 07ac5f2'),
  muted('Running the install script'),
  prompt('build', 'sudo apt-get install -y postgresql-client-16 redis-server'),
  plain('Setting up redis-server (5:7.0.15-1build2) ...'),
  prompt('build', 'cd ~/code/storefront && npm ci && npx prisma generate'),
  plain('added 1184 packages in 41s'),
]

/** The end of a failed build. */
export const failedBuildLog: readonly TerminalLine[] = [
  muted('Running the install script'),
  prompt('build', 'cd ~/code/storefront && npm ci && npx prisma generate'),
  error('npm error code ERESOLVE'),
  error('npm error ERESOLVE unable to resolve dependency tree'),
  error('npm error peer react@"^18.0.0" from react-day-picker@8.10.1'),
  muted('The install script stopped with exit code 1.'),
]

/**
 * The end of a build that passed its 60-minute limit: a postinstall script
 * watches its files, so the install script never ends. The app then adds
 * the saved message of the build as the last line.
 */
export const timedOutBuildLog: readonly TerminalLine[] = [
  muted('Running the install script'),
  prompt('build', 'cd ~/code/storefront && npm ci && npx prisma generate'),
  plain('added 1184 packages in 41s'),
  prompt('build', 'cd ~/code/billing-service && pnpm install'),
  plain('Done in 12.4s'),
  muted('> billing-service@1.4.0 postinstall'),
  muted('> prisma generate --watch'),
  plain('Watching... prisma/schema.prisma'),
  muted(timedOutBuild.error),
]

/**
 * The start of the first build of Firna, the new org of the sign-up: it
 * loads the two repositories, then installs the software of the cloud
 * computer. The install script of a new org is empty.
 */
const firstBuildStart: readonly TerminalLine[] = [
  muted('Cloning 2 repositories into ~/code'),
  success(' ✓ firna/components at 3e9d2b7'),
  success(' ✓ firna/docs at c41a8f0'),
  muted('Installing the cloud computer software'),
]

/** The first build of Firna while it runs. */
export const firstBuildLog: readonly TerminalLine[] = [
  ...firstBuildStart,
  plain('Setting up nodejs (24.11.0-1nodesource1) ...'),
]

/** The first build of Firna, which failed at a short network fault. */
export const failedFirstBuildLog: readonly TerminalLine[] = [
  ...firstBuildStart,
  error('E: Temporary failure resolving archive.ubuntu.com'),
  muted('The software install stopped with exit code 100.'),
]

/** The first build of Firna, which the app stopped at its 60-minute limit. */
export const timedOutFirstBuildLog: readonly TerminalLine[] = [
  ...firstBuildStart,
  plain('Setting up nodejs (24.11.0-1nodesource1) ...'),
  muted(timedOutBuild.error),
]

export const workspaceSessionPrompt = `${workspaceLocation} $ `

/** A new workspace: the terminal waits at its first prompt. */
export const freshSessionPrompt = `storefront (${savedCarts.branch}) $ `
