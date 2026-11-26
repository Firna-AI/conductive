import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../app/api/client'
import { ManualDelay, requestLines } from '../app/test-kit'
import { Store } from '../app/store'
import { githubPaths } from '../shared/github'
import { workspacePaths } from '../shared/workspaces'
import { FakeApiServer } from '../test-support/fake-api'
import {
  continuedReply,
  continueQuestionReply,
  serveContinue,
  serveMerge,
} from '../test-support/fake-bar'
import { FAKE_IDS } from '../test-support/fixtures/core'
import { FAKE_GITHUB_HEAD_SHA } from '../test-support/fixtures/tools'
import { workspaceFixtures } from '../test-support/fixtures/workspaces'
import { deferred, type Deferred } from '../test-support/mount'
import { BarActions } from './barActions'
import type { PromptResult } from './barPorts'
import { createContinueActions } from './continueActions'
import { createGitHubActions } from './githubActions'
import type { GitHubState } from './githubStore'
import { barWorkspaceStream, githubEvent } from './storeDoubles'
import { snapshotOf } from './testing'

const target = { orgId: FAKE_IDS.org, workspaceId: FAKE_IDS.workspace }
const { org, workspace: id } = FAKE_IDS
const branch = 'calummoore/checkout-autocomplete'
const shortly = { timeout: 10_000 }

function barFor(
  server: FakeApiServer,
  sendPrompt: (text: string) => Promise<PromptResult> = async () => 'sent',
) {
  const delay = new ManualDelay()
  const github = new Store<GitHubState>({
    status: 'ready',
    snapshot: snapshotOf('ready-to-merge'),
  })
  const { events, stream, start } = barWorkspaceStream()
  const { last: streamLast, reconnects } = stream
  const refreshGitHub = vi.fn()
  const actions = new BarActions({
    branch,
    github: createGitHubActions(server.fetch, target),
    continues: createContinueActions(createApiClient(server.fetch), target),
    sendPrompt,
    delay: delay.delay,
    githubState: github,
    refreshGitHub,
    streamLast,
    reconnects,
  })
  const stop = actions.connect()
  start(19)
  const reads = (path: string) =>
    requestLines(server).filter((line) => line === path).length
  return {
    actions,
    delay,
    events,
    github,
    streamLast,
    reconnects,
    refreshGitHub,
    stop,
    reads,
  }
}

const capabilitiesRead = `GET ${githubPaths.capabilities(org, id)}`
const outcomeOf = (actions: BarActions) => actions.getSnapshot().outcome

describe('the action state of the bar', () => {
  it('reads the access of the member at connect and again after each reconnect', async () => {
    const bar = barFor(new FakeApiServer())
    await vi.waitFor(
      () => expect(bar.actions.getSnapshot().capabilities.status).toBe('ready'),
      shortly,
    )
    bar.reconnects.set(1)
    await vi.waitFor(() => expect(bar.reads(capabilitiesRead)).toBe(2), shortly)
    expect(bar.actions.getSnapshot().capabilities).toEqual({
      status: 'ready',
      capabilities: { canWrite: true, mergeMethod: 'squash' },
    })
  })

  it('merges the head that the bar shows with the method of the member, reads the pending job again, and shows Merging until a newer GitHub state', async () => {
    const server = new FakeApiServer()
    serveMerge(server, 'merged')
    const bar = barFor(server)
    await vi.waitFor(() => expect(bar.reads(capabilitiesRead)).toBe(1), shortly)
    await vi.waitFor(
      () => expect(bar.actions.getSnapshot().capabilities.status).toBe('ready'),
      shortly,
    )

    const merging = bar.actions.merge(snapshotOf('ready-to-merge'))
    await vi.waitFor(() => expect(bar.delay.waits).toEqual([1_000]), shortly)
    expect(outcomeOf(bar.actions)).toEqual({ kind: 'merging' })
    await bar.delay.runAll()
    await merging

    const start = server.requests.find(
      (request) => new URL(request.url).pathname === githubPaths.merge(org, id),
    )
    expect({
      body: await start?.clone().json(),
      refreshes: bar.refreshGitHub.mock.calls.length,
      outcome: outcomeOf(bar.actions),
    }).toEqual({
      body: { headSha: FAKE_GITHUB_HEAD_SHA, method: 'squash' },
      refreshes: 1,
      outcome: { kind: 'merging' },
    })
    bar.github.set({ status: 'ready', snapshot: snapshotOf('merged') })
    expect(outcomeOf(bar.actions)).toBeNull()
  })

  it('keeps each refusal until a newer GitHub state, and reads the access again after a missing right', async () => {
    const server = new FakeApiServer()
    const bar = barFor(server)
    await vi.waitFor(
      () => expect(bar.actions.getSnapshot().capabilities.status).toBe('ready'),
      shortly,
    )
    serveMerge(server, 'moved-head')
    await bar.actions.merge(snapshotOf('ready-to-merge'))
    const movedHead = outcomeOf(bar.actions)
    bar.github.set({ status: 'ready', snapshot: snapshotOf('ready-to-merge') })
    const afterNewState = outcomeOf(bar.actions)
    serveMerge(server, 'no-right')
    await bar.actions.merge(snapshotOf('ready-to-merge'))

    await vi.waitFor(() => expect(bar.reads(capabilitiesRead)).toBe(2), shortly)
    expect({
      movedHead,
      afterNewState,
      noRight: outcomeOf(bar.actions),
    }).toEqual({
      movedHead: { kind: 'merge-refused', reason: 'merge-moved-head' },
      afterNewState: null,
      noRight: { kind: 'merge-refused', reason: 'merge-no-right' },
    })
  })

  it('stops the reads of a pending merge, and shows no run, when the store stops', async () => {
    const server = new FakeApiServer()
    serveMerge(server, 'merged')
    const bar = barFor(server)
    await vi.waitFor(
      () => expect(bar.actions.getSnapshot().capabilities.status).toBe('ready'),
      shortly,
    )
    void bar.actions.merge(snapshotOf('ready-to-merge'))
    await vi.waitFor(() => expect(bar.delay.pending).toBe(1), shortly)

    bar.stop()

    const poll = `GET ${githubPaths.mergeResult(org, id, `merge-${id}`)}`
    expect({
      timers: bar.delay.pending,
      outcome: outcomeOf(bar.actions),
      polls: bar.reads(poll),
    }).toEqual({ timers: 0, outcome: null, polls: 0 })
  })

  it('gives the result of a prompt only to the connection of its press, also when the store connects again before the reply', async () => {
    const replies: Deferred<PromptResult>[] = []
    const bar = barFor(new FakeApiServer(), () => {
      const reply = deferred<PromptResult>()
      replies.push(reply)
      return reply.promise
    })
    const press = () => bar.actions.sendPrompt('Fix the failed checks.')

    const stopped = press()
    bar.stop()
    replies[0]?.resolve('failed')
    const afterStop = await stopped
    let stop = bar.actions.connect()
    const reconnected = press()
    stop()
    stop = bar.actions.connect()
    replies[1]?.resolve('failed')
    const afterReconnect = await reconnected
    const shown = press()
    replies[2]?.resolve('failed')
    const whileConnected = await shown
    stop()

    // The chat got each press, and finishes each send on its own.
    expect({
      afterStop,
      afterReconnect,
      whileConnected,
      sends: replies.length,
    }).toEqual({
      afterStop: null,
      afterReconnect: null,
      whileConnected: 'failed',
      sends: 3,
    })
  })

  it('asks about local work, sends nothing on Cancel, and ends Continue anyway at the first event after the seed', async () => {
    const server = new FakeApiServer()
    serveContinue(server, 'question')
    const bar = barFor(server)
    const asking = bar.actions.continueWorkspace()
    await vi.waitFor(() => expect(bar.delay.pending).toBe(1), shortly)
    const checking = outcomeOf(bar.actions)
    await bar.delay.runAll()
    await asking
    const question = bar.actions.getSnapshot().question
    const starts = () =>
      server.requests.filter(
        (request) =>
          request.method === 'POST' &&
          new URL(request.url).pathname === workspacePaths.continue(org, id),
      )
    bar.actions.cancelContinue()
    const cancelled = {
      question: bar.actions.getSnapshot().question,
      starts: starts().length,
    }
    // A second press asks again, and Continue anyway allows the work.
    const again = bar.actions.continueWorkspace()
    await vi.waitFor(() => expect(bar.delay.pending).toBe(1), shortly)
    await bar.delay.runAll()
    await again
    continuedReply(server, workspaceFixtures().detail.workspace, 20)
    const follows = vi.spyOn(bar.streamLast, 'subscribe')
    bar.actions.confirmContinue()
    await vi.waitFor(() => expect(bar.delay.pending).toBe(1), shortly)
    await bar.delay.runAll()
    // The reply names event 20, so the run follows the stream until then.
    await vi.waitFor(() => expect(follows).toHaveBeenCalledOnce(), shortly)
    const waiting = outcomeOf(bar.actions)
    expect(bar.streamLast.get()).toBe(19)
    bar.events.send({
      type: 'event',
      envelope: githubEvent(20, 'ready-to-merge'),
    })

    expect({
      checking,
      question,
      cancelled,
      bodies: await Promise.all(
        starts().map((request) => request.clone().json()),
      ),
      waiting,
    }).toEqual({
      checking: { kind: 'continuing' },
      question: {
        branch: continueQuestionReply.branch,
        baseBranch: 'main',
        localWork: continueQuestionReply.localWork,
      },
      cancelled: { question: null, starts: 1 },
      bodies: [
        { expectedBranch: branch },
        { expectedBranch: branch },
        { expectedBranch: branch, allowLocalWork: true },
      ],
      waiting: { kind: 'continuing' },
    })
    await vi.waitFor(() => expect(outcomeOf(bar.actions)).toBeNull(), shortly)
  })

  it('shows the wait for a turn, and the safe words of the Worker for every other stop', async () => {
    const turn = new FakeApiServer()
    serveContinue(turn, 'turn')
    const waits = barFor(turn)
    await waits.actions.continueWorkspace()
    const clash = new FakeApiServer()
    serveContinue(clash, 'clash')
    const stopped = barFor(clash)
    const run = stopped.actions.continueWorkspace()
    await vi.waitFor(() => expect(stopped.delay.pending).toBe(1), shortly)
    await stopped.delay.runAll()
    await run

    expect([outcomeOf(waits.actions), outcomeOf(stopped.actions)]).toEqual([
      { kind: 'continue-waits' },
      {
        kind: 'continue-failed',
        message: `Continue stopped: the changed files clash with the latest main. The workspace stays on ${branch}.`,
      },
    ])
  })
})
