/**
 * Terminal sessions. Each line is a list of coloured segments.
 */

import { installingSoftware } from '../components/workspace/updateCopy'
import { failedBuild, timedOutBuild } from './computer'
import { checkoutAutocomplete, savedCarts } from './workspaces'

export type TerminalTone =
  'prompt' | 'plain' | 'muted' | 'success' | 'accent' | 'error'

type TerminalSegment = { text: string; tone: TerminalTone }

export type TerminalLine = readonly TerminalSegment[]

function prompt(location: string, command: string): TerminalLine {
  return [
    { text: `${location} $ `, tone: 'prompt' },
    { text: command, tone: 'plain' },
  ]
}

export function plain(text: string): TerminalLine {
  return [{ text, tone: 'plain' }]
}

export function muted(text: string): TerminalLine {
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

export function error(text: string): TerminalLine {
  return [{ text, tone: 'error' }]
}

/** The start of the install script of a build of Acme, after its clones. */
const acmeInstallStart: readonly TerminalLine[] = [
  muted('Running the install script'),
  prompt('build', 'sudo apt-get install -y postgresql-client-16 redis-server'),
  plain('Setting up redis-server (5:7.0.15-1build2) ...'),
]

/** The clone of the 3 repositories of Acme, at the start of each job. */
const acmeClones: readonly TerminalLine[] = [
  muted('Cloning 3 repositories into ~/code'),
  success(' ✓ acme/storefront at 4f2c9a1'),
  success(' ✓ acme/billing-service at b81d0e4'),
  success(' ✓ acme/marketing-site at 07ac5f2'),
]

/** A build of the cloud computer while it runs: the newest lines. */
export const buildLog: readonly TerminalLine[] = [
  ...acmeClones,
  ...acmeInstallStart,
  prompt('build', 'cd ~/code/storefront && npm ci && npx prisma generate'),
  plain('added 1184 packages in 41s'),
]

/**
 * The software step of a job without a ready software image, such as just
 * after a deploy whose software image failed. Such a job starts from the
 * base image, so it installs the agent and terminal software after the
 * clones, before the install script. A job from the software image skips
 * the step.
 */
const softwareStep: readonly TerminalLine[] = [
  muted(installingSoftware),
  plain('Setting up ttyd (1.7.4-1build1) ...'),
]

/** A build without a ready software image while it runs. */
export const fallbackBuildLog: readonly TerminalLine[] = [
  ...acmeClones,
  ...softwareStep,
  ...acmeInstallStart,
]

/**
 * The clones of a refresh of Acme. Each refresh is a clean build: it clones
 * each repository of the newest good build at its newest commit. The push
 * brought a new commit of acme/storefront.
 */
const refreshClones: readonly TerminalLine[] = [
  muted('Cloning 3 repositories into ~/code'),
  success(' ✓ acme/storefront at 9a7e31c'),
  success(' ✓ acme/billing-service at b81d0e4'),
  success(' ✓ acme/marketing-site at 07ac5f2'),
]

/**
 * A refresh of Acme while it runs. It starts from the software image and
 * runs the install script of the newest good build.
 */
export const refreshLog: readonly TerminalLine[] = [
  ...refreshClones,
  ...acmeInstallStart,
  prompt('build', 'cd ~/code/storefront && npm ci && npx prisma generate'),
]

/** A refresh without a ready software image while it runs. */
export const fallbackRefreshLog: readonly TerminalLine[] = [
  ...refreshClones,
  ...softwareStep,
  ...acmeInstallStart,
]

/**
 * The end of a failed refresh: a new commit changed a manifest, and the
 * lockfile no longer matched it.
 */
export const failedRefreshLog: readonly TerminalLine[] = [
  muted('Running the install script'),
  prompt('build', 'cd ~/code/storefront && npm ci && npx prisma generate'),
  plain('added 1184 packages in 41s'),
  prompt('build', 'cd ~/code/billing-service && pnpm install'),
  error(
    ' ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with package.json',
  ),
  muted('The install script stopped with exit code 1.'),
]

/** The repositories of Acme, with the commit that a build clones. */
const acmeCommits = [
  ['acme/storefront', '4f2c9a1'],
  ['acme/billing-service', 'b81d0e4'],
  ['acme/marketing-site', '07ac5f2'],
  ['acme/admin-dashboard', '5d19e3b'],
] as const

/**
 * The log of a build of Acme that clones the chosen repositories, such as
 * the build that an added repository starts, at the start of its install
 * script. The log box shows the first lines of a log, so this log is no
 * longer than the log of other builds.
 */
export function acmeBuildLog(
  chosen: readonly string[],
): readonly TerminalLine[] {
  const cloned = acmeCommits.filter(([name]) => chosen.includes(name))
  return [
    muted(`Cloning ${cloned.length} repositories into ~/code`),
    ...cloned.map(([name, commit]) => success(` ✓ ${name} at ${commit}`)),
    ...acmeInstallStart,
  ]
}

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
 * The start of the first build of Firna, the new org of the sign-up. The
 * build starts from the software image, which already holds the agent and
 * terminal software. So it loads the two repositories.
 */
const firstBuildStart: readonly TerminalLine[] = [
  muted('Cloning 2 repositories into ~/code'),
  success(' ✓ firna/components at 3e9d2b7'),
]

/**
 * The first build of Firna while it saves the image. The install script of
 * a new org is empty, so the build skips the install step, and its log
 * shows no install step.
 */
export const firstBuildLog: readonly TerminalLine[] = [
  ...firstBuildStart,
  success(' ✓ firna/docs at c41a8f0'),
]

/**
 * The first build of Firna, which failed when the app saved its image. The
 * app adds the saved message of the build as the last line.
 */
export const failedFirstBuildLog: readonly TerminalLine[] = [
  ...firstBuildLog,
  muted(failedBuild.error),
]

/**
 * The first build of Firna, which the app stopped at its 60-minute limit
 * while it still loaded a large repository.
 */
export const timedOutFirstBuildLog: readonly TerminalLine[] = [
  ...firstBuildStart,
  muted(timedOutBuild.error),
]

/** A new workspace: the terminal waits at its first prompt. */
export const freshSessionPrompt = `storefront (${savedCarts.branch}) $ `
