import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../app/api/client'
import { ManualDelay } from '../app/test-kit'
import { Store } from '../app/store'
import { githubPaths } from '../shared/github'
import { FakeApiServer } from '../test-support/fake-api'
import { serveAccess } from '../test-support/fake-bar'
import { serveReady } from '../test-support/fake-ready'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { BarActions } from './barActions'
import { barCommands } from './barKeys'
import { barViewOf, type BarInput } from './barView'
import { createContinueActions } from './continueActions'
import { createGitHubActions } from './githubActions'
import type { GitHubState } from './githubStore'
import { barWorkspaceStream } from './storeDoubles'
import { snapshotOf } from './testing'

const target = { orgId: FAKE_IDS.org, workspaceId: FAKE_IDS.workspace }
const shortly = { timeout: 10_000 }
const writer: BarInput['capabilities'] = {
  status: 'ready',
  capabilities: { canWrite: true, mergeMethod: 'squash' },
}

function draftView(input: Partial<Omit<BarInput, 'snapshot'>> = {}) {
  return barViewOf({
    snapshot: snapshotOf('draft'),
    capabilities: writer,
    localWork: 'none',
    outcome: null,
    turnRuns: false,
    readOnly: false,
    archivable: true,
    archiving: false,
    ...input,
  })
}

describe('Ready for review in the bar', () => {
  it('shows only for write access that the Worker read', () => {
    const reader: BarInput['capabilities'] = {
      status: 'ready',
      capabilities: { canWrite: false, mergeMethod: null },
    }
    expect({
      writer: draftView().actions,
      reader: draftView({ capabilities: reader }).actions,
      failed: draftView({ capabilities: { status: 'failed' } }).actions,
      loading: draftView({ capabilities: { status: 'loading' } }).actions,
      readOnly: draftView({ readOnly: true }).actions,
    }).toEqual({
      writer: [{ kind: 'ready', busy: false }],
      reader: [],
      failed: [],
      loading: [],
      readOnly: [],
    })
  })

  it('shows busy while it runs, and a refusal under the bar of the draft', () => {
    const busy = draftView({ outcome: { kind: 'marking-ready' } })
    expect(busy.actions).toEqual([{ kind: 'ready', busy: true }])
    expect(barCommands({ view: busy, onAction: () => {} }, () => {})).toEqual([
      { command: 'open-pull-request', run: expect.any(Function) },
    ])
    const url = snapshotOf('draft').banner.pullRequest?.url
    const refusal = (
      reason: 'ready-no-right' | 'ready-pull-changed' | 'ready-refused',
    ) => draftView({ outcome: { kind: 'ready-refused', reason } })
    expect({
      refused: refusal('ready-refused').message,
      changed: refusal('ready-pull-changed').message,
      noRight: refusal('ready-no-right'),
    }).toMatchObject({
      refused: {
        text: 'Not marked ready: GitHub refused the change.',
        tone: 'danger',
        href: url,
      },
      changed: {
        text: 'Not marked ready: the branch has another pull request now. Review it, then try again.',
        href: null,
      },
      // A missing right hides the button at once, as for Merge.
      noRight: {
        actions: [],
        message: {
          text: "Not marked ready: your GitHub access doesn't allow changes to this pull request.",
          href: null,
        },
      },
    })
    const failed = draftView({
      outcome: {
        kind: 'ready-failed',
        message: 'GitHub is not available. Try again.',
      },
    })
    expect(failed.message).toEqual({
      text: 'GitHub is not available. Try again.',
      tone: 'danger',
      href: url,
    })
  })

  it('gives the button the command of its key', () => {
    const onAction = vi.fn()
    const commands = barCommands({ view: draftView(), onAction }, () => {})
    expect(commands.map((command) => command.command)).toEqual([
      'mark-ready-for-review',
      'open-pull-request',
    ])
    commands[0].run()
    expect(onAction).toHaveBeenCalledWith({ kind: 'ready', busy: false })
  })
})

function barFor(server: FakeApiServer) {
  const github = new Store<GitHubState>({
    status: 'ready',
    snapshot: snapshotOf('draft'),
  })
  const refreshGitHub = vi.fn()
  const { stream, start } = barWorkspaceStream()
  const actions = new BarActions({
    branch: 'calummoore/checkout-autocomplete',
    github: createGitHubActions(server.fetch, target),
    continues: createContinueActions(createApiClient(server.fetch), target),
    sendPrompt: async () => 'sent',
    delay: new ManualDelay().delay,
    githubState: github,
    refreshGitHub,
    streamLast: stream.last,
    reconnects: stream.reconnects,
  })
  actions.connect()
  start(19)
  return { actions, github, refreshGitHub }
}

const capabilityReads = (server: FakeApiServer) =>
  server.requests.filter(
    (request) =>
      new URL(request.url).pathname ===
      githubPaths.capabilities(target.orgId, target.workspaceId),
  ).length

describe('the run of Ready for review', () => {
  it('sends the number that the bar shows, and shows Marking ready until a newer GitHub state', async () => {
    const server = new FakeApiServer()
    serveReady(server, 'ready')
    const bar = barFor(server)
    await bar.actions.markReady(snapshotOf('draft'))
    const sent = server.requests.find(
      (request) =>
        new URL(request.url).pathname ===
        githubPaths.ready(target.orgId, target.workspaceId),
    )
    expect({
      body: await sent?.clone().json(),
      method: sent?.method,
      refreshes: bar.refreshGitHub.mock.calls.length,
      accessReads: capabilityReads(server),
      outcome: bar.actions.getSnapshot().outcome,
    }).toEqual({
      body: { pullNumber: snapshotOf('draft').banner.pullRequest?.number },
      method: 'POST',
      refreshes: 1,
      accessReads: 1,
      outcome: { kind: 'marking-ready' },
    })
    bar.github.set({ status: 'ready', snapshot: snapshotOf('ready-to-merge') })
    expect(bar.actions.getSnapshot().outcome).toBeNull()
  })

  it('shows the words of each refusal, and reads the access again after a missing right', async () => {
    const server = new FakeApiServer()
    const bar = barFor(server)
    await vi.waitFor(() => expect(capabilityReads(server)).toBe(1), shortly)
    serveReady(server, 'refused')
    await bar.actions.markReady(snapshotOf('draft'))
    expect(bar.actions.getSnapshot().outcome).toEqual({
      kind: 'ready-refused',
      reason: 'ready-refused',
    })
    serveReady(server, 'pull-changed')
    await bar.actions.markReady(snapshotOf('draft'))
    expect(bar.actions.getSnapshot().outcome).toEqual({
      kind: 'ready-refused',
      reason: 'ready-pull-changed',
    })
    expect(capabilityReads(server)).toBe(1)

    serveReady(server, 'no-right')
    serveAccess(server, 'read')
    await bar.actions.markReady(snapshotOf('draft'))
    expect(bar.actions.getSnapshot().outcome).toEqual({
      kind: 'ready-refused',
      reason: 'ready-no-right',
    })
    await vi.waitFor(() => expect(capabilityReads(server)).toBe(2), shortly)
    expect(bar.refreshGitHub).not.toHaveBeenCalled()
  })
})
