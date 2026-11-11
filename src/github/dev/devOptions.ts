import type { BannerState } from '../../shared/github'
import { readScenario, type BarScenario } from '../../test-support/fake-bar-dev'
import { samples, type Sample } from './devSamples'
import type { GitHubMode } from './devSource'

export const bannerStates: readonly BannerState[] = [
  'none',
  'no-commits',
  'checks-running',
  'checks-failed',
  'ready-to-merge',
  'merged',
  'conflict',
  'changes-requested',
  'draft',
  'closed',
  'blocked',
]
export const schemes = ['dark', 'light'] as const
export const viewers = ['owner', 'admin', 'member'] as const
export const modes: readonly GitHubMode[] = ['normal', 'slow', 'error']
export const turns = ['none', 'running'] as const

export interface DevOptions {
  state: BannerState
  scheme: (typeof schemes)[number]
  viewer: (typeof viewers)[number]
  github: GitHubMode
  sample: Sample
  /** A turn runs in the session of the chat. */
  turn: (typeof turns)[number]
  scenario: BarScenario
}

function pick<T extends string>(
  values: readonly T[],
  value: string | null,
  fallback: T,
): T {
  return values.find((item) => item === value) ?? fallback
}

/** The options in the address, so that each state has a link. */
export function readOptions(search: string): DevOptions {
  const query = new URLSearchParams(search)
  return {
    state: pick(bannerStates, query.get('state'), 'ready-to-merge'),
    scheme: pick(schemes, query.get('scheme'), 'dark'),
    viewer: pick(viewers, query.get('viewer'), 'owner'),
    github: pick(modes, query.get('github'), 'normal'),
    sample: pick(samples, query.get('sample'), 'fake'),
    turn: pick(turns, query.get('turn'), 'none'),
    scenario: readScenario(query),
  }
}

export function optionsQuery(options: DevOptions): string {
  const { scenario, ...rest } = options
  return `?${new URLSearchParams({ ...rest, ...scenario })}`
}
