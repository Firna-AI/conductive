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

/** It runs in each workspace's cloud computer at each start and resume. */
export const startupScript = `#!/usr/bin/env bash
set -euo pipefail

redis-server --daemonize yes`

export type EnvVar = { name: string }

export const envVars: readonly EnvVar[] = [
  { name: 'DATABASE_URL' },
  { name: 'PLACES_API_KEY' },
  { name: 'STRIPE_SECRET_KEY' },
  { name: 'NEXT_PUBLIC_SITE_URL' },
]

export type BuildResult = 'succeeded' | 'failed'

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

/** The build that runs, or the build that failed, in those states. */
export const runningBuild = { elapsed: '2m 14s' } as const
export const failedBuild: Build = {
  when: '12 minutes ago',
  result: 'failed',
  duration: '2m 18s',
}
