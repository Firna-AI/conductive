/**
 * The cloud computer of an org: one image that holds every repository of
 * the org, built from the install script. Every workspace of the org starts
 * from its newest good build or refresh.
 */

import type { JobKind } from '../components/settings/buildCopy'

/** What every cloud computer includes before the install script runs. */
export const includedSoftware =
  'Cloud computers run Ubuntu 24.04 and include Node.js 24, npm, pnpm, Bun, Python 3.12, uv, Go, Rust, Java, GCC, Clang, Docker, git, and gh.'

/** It runs at each build and each refresh of the computer. */
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

/**
 * A job of the org image that ended: a build, or a refresh with what
 * started it. Each refresh is a clean build too, so the tab lists both.
 */
export type Build = {
  when: string
  result: BuildResult
  duration: string
  kind: JobKind
}

/** The newest good build, which every workspace starts from. */
export const lastBuild: Build = {
  when: '8 hours ago',
  result: 'succeeded',
  duration: '6m 41s',
  kind: 'build',
}

/** The jobs of the computer that ended, newest first. */
export const buildHistory: readonly Build[] = [
  lastBuild,
  {
    when: 'Yesterday',
    result: 'succeeded',
    duration: '6m 02s',
    kind: 'daily-refresh',
  },
  { when: '3 Nov', result: 'failed', duration: '2m 18s', kind: 'build' },
  { when: '3 Nov', result: 'succeeded', duration: '5m 57s', kind: 'build' },
  {
    when: '28 Oct',
    result: 'succeeded',
    duration: '7m 13s',
    kind: 'push-refresh',
  },
]

/** The build that runs, in that state. */
export const runningBuild = { elapsed: '2m 14s' } as const

/** The refresh that runs, in that state. */
export const runningRefresh = { elapsed: '1m 05s' } as const

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
  kind: 'build',
}

/**
 * The install script that an admin of Firna saves after the first build.
 * A new org starts with empty scripts and no env vars.
 */
export const firnaInstallScript = `#!/usr/bin/env bash
set -euo pipefail

cd ~/code/components && npm ci
cd ~/code/docs && npm ci`

/** A build that ended in failure, with the message that the app saved. */
export type FailedBuild = Build & { result: 'failed'; error: string }

/** The build that failed because its install script failed. */
export const failedBuild: FailedBuild = {
  when: '12 minutes ago',
  result: 'failed',
  duration: '2m 18s',
  kind: 'build',
  error:
    'The cloud computer image could not build. Check the log and try again.',
}

/** The build that the app stopped at its 60-minute limit. */
export const timedOutBuild: FailedBuild = {
  when: '1 hour ago',
  result: 'failed',
  duration: '1h 00m',
  kind: 'build',
  error:
    'The cloud computer image did not build within the 60-minute limit. Check the log and try again.',
}

/** A refresh, which starts by itself after a push or each day. */
export type RefreshKind = Exclude<JobKind, 'build'>

/** The newest refresh of Acme, which succeeded after the last build. */
export function goodRefresh(kind: RefreshKind): Build {
  return { when: '2 hours ago', result: 'succeeded', duration: '6m 12s', kind }
}

/**
 * The newest refresh of Acme, whose install script failed on new commits.
 * The app saves the message of a failed build for it.
 */
export function failedRefresh(kind: RefreshKind): FailedBuild {
  return { ...failedBuild, duration: '3m 02s', kind }
}

/** The newest refresh of Acme, which the app stopped at its limit. */
export function timedOutRefresh(kind: RefreshKind): FailedBuild {
  return { ...timedOutBuild, kind }
}

/**
 * The newest build of Acme when it failed before the newest refresh, after
 * the last good build. Its install script failed, as in the failed build.
 */
export const failedBuildBeforeRefresh: FailedBuild = {
  ...failedBuild,
  when: '5 hours ago',
}
