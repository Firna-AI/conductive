import { describe, expect, test } from 'vitest'
import {
  routinePaths,
  type RoutineRun,
  type RoutineRunsResponse,
} from '../shared/routines'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../test-support/fixtures/core'
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

function setup() {
  const server = new FakeApiServer()
  const delay = new ManualDelay()
  const focus = new ManualFocus()
  const model = new OrgModel(
    testServices(server, { delay: delay.delay, onFocus: focus.onFocus }),
    org,
  )
  return { server, delay, focus, runs: new RoutineRuns(model, routineId) }
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

  test('Show older runs adds the next page, and a later read of the newest runs leaves no gap', async () => {
    const { server, delay, runs } = setup()
    const r1 = run('r1', 40)
    const r2 = run('r2', 30)
    const r3 = run('r3', 20)
    const r4 = run('r4', 10)
    server.json('GET', routinePaths.runs(org, routineId), page([r3, r2], 'r2'))
    server.json(
      'GET',
      routinePaths.runs(org, routineId, 'r2'),
      page([r1], null),
    )
    const stop = runs.watch()
    await flushMicrotasks()
    const shown = () => {
      const value = valueOf(runs.shown.get())
      return { ids: value?.runs.map((item) => item.id), more: value?.more }
    }
    const first = shown()
    await runs.loadOlder()
    const older = shown()
    // A new run pushes r2 out of the newest page of the server.
    server.json('GET', routinePaths.runs(org, routineId), page([r4, r3], 'r3'))
    await delay.runAll()
    const later = shown()
    stop()
    expect({ first, older, later }).toEqual({
      first: { ids: ['r3', 'r2'], more: true },
      older: { ids: ['r3', 'r2', 'r1'], more: false },
      later: { ids: ['r4', 'r3', 'r2', 'r1'], more: false },
    })
  })
})
