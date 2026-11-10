import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BarAction } from '../../docs/mockups/src/components/workspace/barModel'
import type { BannerState } from '../shared/github'
import { toolFixtures } from '../test-support/fixtures/tools'
import type { PullRequestBanner } from './bannerStatus'
import { barViewOf, type BarControls, type BarInput } from './barView'
import type { GitHubSnapshot } from './githubClient'
import type { GitHubFeed, GitHubState } from './githubStore'

/*
 * Helpers for the tests of this folder. Product code never imports this
 * module. The static view tests run in Node and read a component's text,
 * links, buttons, and list items. The hook and action tests opt into
 * happy-dom and mount the real hook or components.
 */

const entities: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
}

function decode(text: string): string {
  return text.replace(/&(?:amp|lt|gt|quot|#x27);/g, (entity) => {
    return entities[entity] ?? entity
  })
}

export function render(node: ReactNode): string {
  return renderToStaticMarkup(node)
}

/** The visible and spoken text of some markup, with single spaces. */
export function textOf(html: string): string {
  const text = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ')
  return decode(text).replace(/\s+/g, ' ').trim()
}

export function linksIn(html: string): { text: string; href: string | null }[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => {
    const href = /\bhref="([^"]*)"/.exec(match[1])?.[1]
    return { text: textOf(match[2]), href: href ? decode(href) : null }
  })
}

export function buttonsIn(html: string): string[] {
  const buttons = html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)
  return [...buttons].map((match) => textOf(match[1]))
}

export function itemsIn(html: string): string[] {
  const items = html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)
  return [...items].map((match) => textOf(match[1]))
}

/** The banner and the checks that the fake API sends for a state. */
export function snapshotOf(state: BannerState): GitHubSnapshot {
  const data = toolFixtures(state)
  return { banner: data.banner.banner, checks: data.checks }
}

export function feedOf(
  state: GitHubState,
  retry: () => void = () => undefined,
): GitHubFeed {
  return { state, retry }
}

export function readyFeed(snapshot: GitHubSnapshot): GitHubFeed {
  return feedOf({ status: 'ready', snapshot })
}

/** A banner and checks for a branch without a pull request. */
export function branchFeed(state: 'none' | 'no-commits'): GitHubFeed {
  return readyFeed({
    banner: {
      branch: 'calummoore/checkout-autocomplete',
      baseBranch: 'main',
      updatedAt: 1_800_000_000_000,
      state,
      pullRequest: null,
    },
    checks: { state: 'waiting-for-pull-request', checks: [] },
  })
}

/**
 * The bar actions of a ready feed, from the real rules: by default a member
 * with write access and the squash method, a sandbox without local work, no
 * turn, and Archive for the viewer. `onAction` records each press. Null for
 * a feed that shows no state.
 */
export function controlsOf(
  github: GitHubFeed,
  input: Partial<Omit<BarInput, 'snapshot'>> = {},
  onAction: (action: BarAction) => void = () => undefined,
): BarControls | null {
  const { state } = github
  if (state.status !== 'ready') return null
  const view = barViewOf({
    snapshot: state.snapshot,
    capabilities: {
      status: 'ready',
      capabilities: { canWrite: true, mergeMethod: 'squash' },
    },
    localWork: 'no',
    outcome: null,
    turnRuns: false,
    readOnly: false,
    archivable: true,
    archiving: false,
    ...input,
  })
  return { view, onAction }
}

/** The fake's banner of a state that has a pull request. */
export function pullRequestBanner(state: BannerState): PullRequestBanner {
  const { banner } = snapshotOf(state)
  if (banner.pullRequest === null)
    throw new Error(`${state} has no pull request`)
  return banner
}
