/**
 * The builds of the own computers of Acme, which the page of each computer
 * shows in the build card of the Cloud computer tab. Each own computer
 * builds the setup of Acme from the base image of the app: the chosen
 * repositories, the install script, and the env vars.
 */
import type { BuildState, OrgBuilds } from '../components/settings/BuildSection'
import type { Build, FailedBuild } from './computer'
import type { OwnComputerKey } from './ownComputers'
import type { TerminalLine } from './terminal'

function muted(text: string): TerminalLine {
  return [{ text, tone: 'muted' }]
}

function success(text: string): TerminalLine {
  return [{ text, tone: 'success' }]
}

function plain(text: string): TerminalLine {
  return [{ text, tone: 'plain' }]
}

function error(text: string): TerminalLine {
  return [{ text, tone: 'error' }]
}

function command(text: string): TerminalLine {
  return [
    { text: 'build $ ', tone: 'prompt' },
    { text, tone: 'plain' },
  ]
}

/** The start of each build of Acme on an own computer. */
const buildStart: readonly TerminalLine[] = [
  muted('Downloading the base image'),
  success(' ✓ Signature checked'),
  muted('Cloning 3 repositories into ~/code'),
  success(' ✓ acme/storefront at 4f2c9a1'),
  success(' ✓ acme/billing-service at b81d0e4'),
  success(' ✓ acme/marketing-site at 07ac5f2'),
  muted('Running the install script'),
  command('sudo apt-get install -y postgresql-client-16 redis-server'),
  plain('Setting up redis-server (5:7.0.15-1build2) ...'),
]

/** The first build of build-03, which ran out of disk space. */
const firstFailed: FailedBuild = {
  when: '12 minutes ago',
  result: 'failed',
  duration: '5m 47s',
  error:
    'build-03 ran out of disk space while it saved the image. Free some space on the server, then try again.',
}

/** A later build of build-01, whose install script failed. */
const laterFailed: FailedBuild = {
  when: '40 minutes ago',
  result: 'failed',
  duration: '2m 18s',
  error:
    'The setup of Acme could not build on build-01. Check the log and try again.',
}

/**
 * The end of each failed build, which the log box shows from its first
 * line. The app adds the saved message of a first build as its last line.
 */
const firstFailedLog: readonly TerminalLine[] = [
  muted('Running the install script'),
  command('cd ~/code/storefront && npm ci && npx prisma generate'),
  plain('added 1184 packages in 41s'),
  muted('Saving the image'),
  error('Error: writing blob: no space left on device'),
  muted(firstFailed.error),
]

const laterFailedLog: readonly TerminalLine[] = [
  muted('Running the install script'),
  command('cd ~/code/storefront && npm ci && npx prisma generate'),
  error('npm error code ERESOLVE'),
  error('npm error peer react@"^18.0.0" from react-day-picker@8.10.1'),
  muted('The install script stopped with exit code 1.'),
]

/** The good builds of an own computer of Acme, newest first. */
function goodBuilds(built: string): Build[] {
  return [
    { when: built, result: 'succeeded', duration: '7m 02s' },
    { when: '19 Nov', result: 'succeeded', duration: '6m 48s' },
    { when: '12 Nov', result: 'succeeded', duration: '9m 40s' },
  ]
}

/** When the newest good build of each computer ended, if it has one. */
const builtWhen: Readonly<Record<OwnComputerKey, string | undefined>> = {
  'build-01': '3 hours ago',
  'build-02': '3 hours ago',
  'lab-server': '20 hours ago',
  'build-03': undefined,
}

/**
 * The builds of an own computer in a state of its build card. build-03
 * has no good build yet, so its first build runs or failed. A later build
 * that failed leaves the good build of the computer in use.
 */
export function ownComputerBuilds(
  key: OwnComputerKey,
  state: BuildState,
): OrgBuilds {
  const built = builtWhen[key]
  const failed = built === undefined ? firstFailed : laterFailed
  const failedLog = built === undefined ? firstFailedLog : laterFailedLog
  const logs = {
    building: buildStart,
    waiting: buildStart,
    failed: failedLog,
    'time-limit': failedLog,
    ended: failedLog,
  }
  const good = built === undefined ? [] : goodBuilds(built)
  const ended = state === 'failed' ? [failed, ...good] : good
  return {
    ...(good[0] === undefined ? {} : { lastGood: good[0] }),
    history: ended.map((build) => ({
      when: build.when,
      result: build.result,
      duration: build.duration,
    })),
    logs,
    failed,
  }
}
