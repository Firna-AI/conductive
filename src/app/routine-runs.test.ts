import { describe, expect, test } from 'vitest'
import {
  routinePaths,
  type RoutineRun,
  type RoutineRunsResponse,
} from '../shared/routines'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_ORIGIN, FAKE_TIME } from '../test-support/fixtures/core'
import { runsPage } from '../test-support/fixtures/routine-runs'
import { deferred, type Deferred } from '../test-support/mount'
import type { FetchLike } from './api/client'
import { OrgModel } from './org-model'
import { RoutineRuns } from './routine-runs'
import { valueOf } from './store'
import {
  flushMicrotasks,
  ManualDelay,
  ManualFocus,
  requestLines,
  testServices,
} from './test-kit'

const org = FAKE_IDS.org
const routineId = 'review-prs'

/** A run of Run now, `minutes` before the fake time, in the ready state. */
function run(id: string, minutes: number): RoutineRun {
  const at = FAKE_TIME - minutes * 60_000
  return {
    id,
    routineId,
    orgId: org,
    agent: 'claude',
    owner: null,
    trigger: { kind: 'run-now' },
    state: 'ready',
    workspaceId: `${id}-workspace`,
    error: null,
    createdAt: at,
    updatedAt: at,
  }
}

function page(
  runs: readonly RoutineRun[],
  nextCursor: string | null,
): RoutineRunsResponse {
  return { runs, nextCursor }
}

/** The runs r1 to r`count`, newest first, a minute apart. */
function history(count: number): RoutineRun[] {
  return Array.from({ length: count }, (_, index) => {
    const number = count - index
    return run(`r${number}`, 1_000 - number)
  })
}

/** The run with this ID is archived. */
function archived(id: string) {
  return (item: RoutineRun): RoutineRun =>
    item.id === id ? { ...item, state: 'archived' } : item
}

/**
 * A fetch whose server pages the runs that `runs` gives at each request,
 * as the Worker pages them, and answers every other request as `server`.
 */
function pagedRuns(
  server: FakeApiServer,
  runs: () => readonly RoutineRun[],
): FetchLike {
  const path = new URL(routinePaths.runs(org, routineId), FAKE_ORIGIN).pathname
  return async (input, init) => {
    const url = new URL(input, FAKE_ORIGIN)
    if (url.pathname !== path) return server.fetch(input, init)
    return Response.json(runsPage(runs(), url.searchParams.get('before')))
  }
}

function setup(fetch?: (server: FakeApiServer) => FetchLike) {
  const server = new FakeApiServer()
  const delay = new ManualDelay()
  const focus = new ManualFocus()
  const model = new OrgModel(
    testServices(server, {
      delay: delay.delay,
      onFocus: focus.onFocus,
      fetch: fetch?.(server),
    }),
    org,
  )
  const runs = new RoutineRuns(model, routineId, model.services.api)
  return { server, delay, focus, runs }
}

describe('the runs of a routine', () => {
  test('read again every 10 seconds while the page shows, and at each return to the page', async () => {
    const { server, delay, focus, runs } = setup()
    server.json('GET', routinePaths.runs(org, routineId), page([], null))
    const stop = runs.watch()
    await flushMicrotasks()
    const waits = delay.waits
    await delay.runAll()
    focus.focus()
    await flushMicrotasks()
    stop()
    expect({
      reads: requestLines(server).filter(
        (line) => line === `GET ${routinePaths.runs(org, routineId)}`,
      ).length,
      waits,
      timers: delay.pending,
      listening: focus.listening,
    }).toEqual({ reads: 3, waits: [10_000], timers: 0, listening: 0 })
  })

  test('each read gets the pages that the list shows, so older rows take their new states and new runs leave every run in reach', async () => {
    let stored = history(60)
    const { delay, runs } = setup((server) => pagedRuns(server, () => stored))
    const shown = () => {
      const value = valueOf(runs.shown.get())
      return {
        count: value?.runs.length,
        newest: value?.runs[0]?.id,
        oldest: value?.runs.at(-1)?.id,
        more: value?.more,
      }
    }
    const stateOf = (id: string) =>
      valueOf(runs.shown.get())?.runs.find((item) => item.id === id)?.state
    const stop = runs.watch()
    await flushMicrotasks()
    const first = shown()
    await runs.loadOlder()
    const older = shown()
    // A run of the older page is archived.
    stored = history(60).map(archived('r5'))
    await delay.runAll()
    const olderState = stateOf('r5')
    // 51 new runs push the oldest rows out of the two pages of the list.
    stored = history(111).map(archived('r5'))
    await delay.runAll()
    const later = shown()
    await runs.loadOlder()
    const all = valueOf(runs.shown.get())
    stop()
    expect({
      first,
      older,
      olderState,
      later,
      all: all && {
        ids: all.runs.map((item) => item.id),
        more: all.more,
        r5: stateOf('r5'),
      },
    }).toEqual({
      first: { count: 50, newest: 'r60', oldest: 'r11', more: true },
      older: { count: 60, newest: 'r60', oldest: 'r1', more: false },
      olderState: 'archived',
      later: { count: 100, newest: 'r111', oldest: 'r12', more: true },
      all: {
        ids: Array.from({ length: 111 }, (_, index) => `r${111 - index}`),
        more: false,
        r5: 'archived',
      },
    })
  })

  test('a read that answers after Show older runs keeps its own pages when new runs moved them, so the list has no gap', async () => {
    let stored = history(60)
    let hold: Deferred<void> | null = null
    const { delay, runs } = setup((server) => {
      const paged = pagedRuns(server, () => stored)
      // The server answers at once, and the next answer waits for the test.
      return async (input, init) => {
        const reply = await paged(input, init)
        const gate = hold
        hold = null
        if (gate) await gate.promise
        return reply
      }
    })
    const shown = () => {
      const value = valueOf(runs.shown.get())
      return {
        count: value?.runs.length,
        newest: value?.runs[0]?.id,
        oldest: value?.runs.at(-1)?.id,
        more: value?.more,
      }
    }
    const stop = runs.watch()
    await flushMicrotasks()
    // 51 new runs arrive, and a read of the newest page waits for its answer.
    stored = history(111)
    const gate = deferred()
    hold = gate
    const read = delay.runAll()
    await runs.loadOlder()
    const older = shown()
    gate.resolve()
    await read
    const answered = shown()
    await delay.runAll()
    const next = shown()
    stop()
    expect({ older, answered, next }).toEqual({
      older: { count: 60, newest: 'r60', oldest: 'r1', more: false },
      answered: { count: 50, newest: 'r111', oldest: 'r62', more: true },
      next: { count: 100, newest: 'r111', oldest: 'r12', more: true },
    })
  })
})
