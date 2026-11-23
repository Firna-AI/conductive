/**
 * The cloud computer of an org: one image that holds every repository of
 * the org, built from the install script. Every workspace of the org starts
 * from its newest good build.
 */

/** What every cloud computer includes before the install script runs. */
export const includedSoftware =
  'Cloud computers run Ubuntu 24.04 and include Node.js 24, npm, pnpm, Bun, Python 3.12, uv, Go, Rust, Java, GCC, Clang, Docker, git, and gh.'

/** It runs only when the user builds the computer. */
export const installScript = `#!/usr/bin/env bash
set -euo pipefail

sudo apt-get install -y postgresql-client-16 redis-server

cd ~/code/storefront && npm ci && npx prisma generate
cd ~/code/billing-service && pnpm install
cd ~/code/marketing-site && bun install`

/** The install script after the user adds a package and saves. */
export const changedInstallScript = installScript.replace(
  'redis-server\n',
  'redis-server ffmpeg\n',
)

/**
 * The install script after an admin removes repositories and takes out
 * their lines, so that the next build does not look for their folders.
 */
export function installScriptWithout(removed: readonly string[]): string {
  const folders = removed.map(
    (name) => `cd ~/code/${name.slice(name.indexOf('/') + 1)} `,
  )
  return installScript
    .split('\n')
    .filter((line) => !folders.some((folder) => line.startsWith(folder)))
    .join('\n')
}

/** It runs in each workspace's cloud computer at each start and resume. */
export const startupScript = `#!/usr/bin/env bash
set -euo pipefail

redis-server --daemonize yes`

/**
 * The GitHub repository of skills that an admin of Acme chose, as
 * owner/name. The agents of every workspace of the org use its skills. A
 * new org has none.
 */
export const skillsRepository = 'acme/agent-skills'

/** The same repository as a link from GitHub, which an admin can paste. */
export const skillsRepositoryLink = `https://github.com/${skillsRepository}`

/**
 * The skill folders of acme/agent-skills, in name order, as the lookup of
 * the Skills section lists them. Acme keeps its own copy of skills that
 * futex-ai/skills also has.
 */
export const agentSkills: readonly string[] = [
  'brainstorming',
  'databases',
  'decisions-and-findings',
  'documentation',
  'git-commit',
  'git-merge',
  'implementation-review',
  'mockups',
  'plans',
  'product-ui',
  'testing',
  'typescript',
]

/**
 * The skills in a file tree of acme/agent-skills that GitHub cut short, as
 * it does for a very large repository: the ones before the cut. The cloud
 * computer still copies every skill.
 */
export const cutTreeSkills: readonly string[] = agentSkills.slice(0, 7)

/** acme/agent-skills with a typo, which GitHub does not find. */
export const misspelledSkillsRepository = 'acme/agent-skils'

/**
 * The name of the repository without its owner. It is neither owner/name
 * nor a link from GitHub, so Save stores it as typed, and it names no
 * repository that an admin can trust.
 */
export const invalidSkillsRepository = 'agent-skills'

/** Another repository of Acme, which an admin types in place of the saved one. */
export const replacementSkillsRepository = 'acme/team-skills'

/**
 * An env var of the org: its name, and its Secret mark. The chat and the
 * start logs hide the value of a secret variable. No screen shows a value.
 */
export type EnvVar = { name: string; secret: boolean }

export const envVars: readonly EnvVar[] = [
  { name: 'DATABASE_URL', secret: true },
  { name: 'PLACES_API_KEY', secret: true },
  { name: 'STRIPE_SECRET_KEY', secret: true },
  { name: 'NEXT_PUBLIC_SITE_URL', secret: false },
]

/** The variable that an admin adds, with the name typed and a value. */
export const newEnvVar = { name: 'SENTRY_DSN', value: 'https://sentry.example' }

type BuildResult = 'succeeded' | 'failed'

export type Build = { when: string; result: BuildResult; duration: string }

/** The newest good build, which every workspace starts from. */
export const lastBuild: Build = {
  when: '8 hours ago',
  result: 'succeeded',
  duration: '6m 41s',
}

/** The builds of the computer, newest first. */
export const buildHistory: readonly Build[] = [
  lastBuild,
  { when: 'Yesterday', result: 'succeeded', duration: '6m 02s' },
  { when: '3 Nov', result: 'failed', duration: '2m 18s' },
  { when: '3 Nov', result: 'succeeded', duration: '5m 57s' },
  { when: '28 Oct', result: 'succeeded', duration: '7m 13s' },
]

/** The build that runs, in that state. */
export const runningBuild = { elapsed: '2m 14s' } as const

/**
 * The build that an admin started while another update of the cloud
 * computer runs, which members do not see, such as the switch build of an
 * operator. It waits for that update. The tab shows it as a build that
 * runs, with its time from Build computer.
 */
export const waitingBuild = { elapsed: '1m 05s' } as const

/**
 * The first build of the cloud computer of a new org, which Create org
 * starts when the org has a repository: it runs, it succeeded, it failed,
 * or none runs, such as after a start that failed. Until it succeeds, the
 * org has no image that a workspace can start from.
 */
export const firstBuildStates = [
  'running',
  'succeeded',
  'failed',
  'none',
] as const

export type FirstBuildState = (typeof firstBuildStates)[number]

/**
 * The first build of Firna, the new org of the sign-up, once it succeeded.
 * Create org started it with the empty scripts of a new org.
 */
export const firstGoodBuild: Build = {
  when: '1 minute ago',
  result: 'succeeded',
  duration: '4m 52s',
}

/**
 * The install script that an admin of Firna saves after the first build.
 * A new org starts with empty scripts and no env vars.
 */
export const firnaInstallScript = `#!/usr/bin/env bash
set -euo pipefail

cd ~/code/components && npm ci
cd ~/code/docs && npm ci`

/**
 * Each build and refresh runs for at most 60 minutes from its start. A
 * build that runs says so under its log.
 */
export const buildLimit = 'Each build has a 60-minute limit.'

/** A build that ended in failure, with the message that the app saved. */
export type FailedBuild = Build & { result: 'failed'; error: string }

/** The build that failed because its install script failed. */
export const failedBuild: FailedBuild = {
  when: '12 minutes ago',
  result: 'failed',
  duration: '2m 18s',
  error:
    'The cloud computer image could not build. Check the log and try again.',
}

/** The build that the app stopped at its 60-minute limit. */
export const timedOutBuild: FailedBuild = {
  when: '1 hour ago',
  result: 'failed',
  duration: '1h 00m',
  error:
    'The cloud computer image did not build within the 60-minute limit. Check the log and try again.',
}

/**
 * The build that an operator ended for another update of the cloud
 * computer, which members do not see, such as the switch build of an
 * operator. Members see a failed build with Try again, and its message
 * names no provider and no switch.
 */
export const endedBuild: FailedBuild = {
  when: '3 minutes ago',
  result: 'failed',
  duration: '6m 12s',
  error: 'Another update of the cloud computer stopped this build. Try again.',
}
