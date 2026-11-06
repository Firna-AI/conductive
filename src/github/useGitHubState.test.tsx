// @vitest-environment happy-dom

import { act, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, onTestFinished, vi } from 'vitest'
import { githubPaths } from '../shared/github'
import { FakeApiServer } from '../test-support/fake-api'
import { toolFixtures } from '../test-support/fixtures/tools'
import type { WorkspaceTarget } from './githubClient'
import type { GitHubFeed, GitHubSource, GitHubState } from './githubStore'
import { githubEvent, heldReplies, readsOf, target } from './storeDoubles'
import { snapshotOf } from './testing'
import { useGitHubState } from './useGitHubState'

function Probe({
  workspace,
  source,
  onCommit,
}: {
  workspace: WorkspaceTarget
  source: GitHubSource
  onCommit: (feed: GitHubFeed) => void
}) {
  const feed = useGitHubState(workspace, source)
  useLayoutEffect(() => {
    onCommit(feed)
  }, [feed, onCommit, workspace.orgId, workspace.workspaceId])
  return (
    <output>
      {feed.state.status === 'ready'
        ? feed.state.snapshot.banner.state
        : feed.state.status}
    </output>
  )
}

/** Mounts the real hook and records the state that each committed view reads. */
function mountProbe() {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  const root = createRoot(container)
  let feed: GitHubFeed | null = null
  const states: GitHubState[] = []
  const onCommit = (next: GitHubFeed): void => {
    feed = next
    states.push(next.state)
  }
  onTestFinished(() => {
    act(() => root.unmount())
    vi.unstubAllGlobals()
  })
  return {
    container,
    states,
    get feed(): GitHubFeed {
      if (!feed) throw new Error('The hook probe has not committed.')
      return feed
    },
    render(workspace: WorkspaceTarget, source: GitHubSource): void {
      act(() => {
        root.render(
          <Probe workspace={workspace} source={source} onCommit={onCommit} />,
        )
      })
    },
  }
}

it('loads the API state without GitHub history and shows each live GitHub update', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  const replies = heldReplies(server)
  const source: GitHubSource = {
    fetch: replies.fetch,
    subscribe: (after, listener) => server.events.subscribe(after, listener),
  }
  const probe = mountProbe()
  probe.render(target, source)
  expect(probe.feed.state).toEqual({ status: 'loading' })

  await act(async () => {
    await replies.release()
  })

  expect(probe.feed.state).toEqual({
    status: 'ready',
    snapshot: snapshotOf('ready-to-merge'),
  })
  expect(probe.container.textContent).toBe('ready-to-merge')
  expect(readsOf(server)).toBe(1)

  act(() => {
    const next = server.events.history().throughEventNumber + 1
    server.events.emit(githubEvent(next, 'merged'))
  })

  expect(probe.feed.state).toEqual({
    status: 'ready',
    snapshot: snapshotOf('merged'),
  })
  expect(probe.container.textContent).toBe('merged')
})

it('uses a new store after a workspace switch and shows loading until its API state arrives', async () => {
  const server = new FakeApiServer({ banner: 'ready-to-merge' })
  const other = { orgId: target.orgId, workspaceId: 'saved-carts' }
  const data = toolFixtures('checks-failed')
  server.json(
    'GET',
    githubPaths.banner(other.orgId, other.workspaceId),
    data.banner,
  )
  server.json(
    'GET',
    githubPaths.checks(other.orgId, other.workspaceId),
    data.checks,
  )
  const replies = heldReplies(server)
  const source: GitHubSource = {
    fetch: replies.fetch,
    subscribe: (after, listener) => server.events.subscribe(after, listener),
  }
  const probe = mountProbe()
  probe.render(target, source)
  await act(async () => {
    await replies.release()
  })
  expect(probe.feed.state).toEqual({
    status: 'ready',
    snapshot: snapshotOf('ready-to-merge'),
  })
  const firstRetry = probe.feed.retry
  const beforeSwitch = probe.states.length

  probe.render(other, source)

  expect(probe.states.slice(beforeSwitch)).toEqual([{ status: 'loading' }])
  expect(probe.container.textContent).toBe('loading')
  expect(probe.feed.retry).not.toBe(firstRetry)

  await act(async () => {
    await replies.release()
  })

  expect(probe.states.slice(beforeSwitch)).toEqual([
    { status: 'loading' },
    { status: 'ready', snapshot: snapshotOf('checks-failed') },
  ])
  expect(probe.container.textContent).toBe('checks-failed')
})
