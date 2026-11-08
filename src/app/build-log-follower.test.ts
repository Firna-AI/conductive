import { describe, expect, test } from 'vitest'
import {
  buildEventsPath,
  buildPath,
  orgSettingsPaths,
  type BuildLogEvent,
  type ImageBuild,
} from '../shared/org-settings'
import { FakeApiServer } from '../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../test-support/fixtures/core'
import { ComputerModel } from './computer-model'
import { OrgModel } from './org-model'
import {
  flushMicrotasks,
  HeldRequests,
  ManualDelay,
  requestLines,
  testServices,
} from './test-kit'

const org = FAKE_IDS.org
const minute = 60_000
const buildsPath = orgSettingsPaths.builds(org)

/** Build A runs. Build B starts after it. */
const buildA: ImageBuild = {
  ...coreFixtures().build.build,
  id: 'build-a',
  state: 'running',
  startedAt: FAKE_TIME - 10 * minute,
  completedAt: null,
  durationMs: null,
}
const buildB: ImageBuild = {
  ...buildA,
  id: 'build-b',
  startedAt: FAKE_TIME - minute,
}

const refused = {
  error: { code: 'server_error', message: 'The request failed.' },
}

function line(eventNumber: number, text: string): BuildLogEvent {
  return { eventNumber, occurredAt: FAKE_TIME, text }
}

/** Build A after it failed, and its whole log. */
const endedA: ImageBuild = {
  ...buildA,
  state: 'failed',
  completedAt: FAKE_TIME,
  durationMs: 10 * minute,
  error: 'The install script stopped with exit code 1.',
}
const finalLogA = [
  line(1, 'Running the install script\n'),
  line(2, 'The install script stopped with exit code 1.\n'),
]

/** A tab over requests that can wait, with a manual log timer. */
function openTab(server: FakeApiServer) {
  const held = new HeldRequests(server)
  const delay = new ManualDelay()
  const model = new OrgModel(testServices(server, { fetch: held.fetch }), org)
  const computer = new ComputerModel(model, delay.delay)
  return { held, delay, model, computer }
}

describe('the build log of the Cloud computer tab', () => {
  test('a poll shares one detail read with a manual reload and keeps the final failure lines', async () => {
    const server = new FakeApiServer()
    const { held, delay, computer } = openTab(server)
    server.json('GET', buildsPath, {
      builds: [buildA],
      currentImageBuildId: null,
    })
    server.json('GET', buildPath(org, buildA.id), {
      build: buildA,
      log: [finalLogA[0]],
    })
    server.response(
      'GET',
      buildEventsPath(org, buildA.id),
      new Response(`event: log\ndata: ${JSON.stringify(finalLogA[0])}\n\n`, {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    )
    computer.start()
    await flushMicrotasks()
    server.json('GET', buildsPath, {
      builds: [endedA],
      currentImageBuildId: null,
    })
    server.json('GET', buildPath(org, buildA.id), {
      build: endedA,
      log: finalLogA,
    })
    held.holdAnswer('GET', buildPath(org, buildA.id))
    const before = server.requests.length
    const poll = delay.runAll()
    const reload = computer.reloadLog()
    held.release('GET', buildPath(org, buildA.id))
    await Promise.all([poll, reload])
    await flushMicrotasks()
    expect({
      log: computer.log.get(),
      timers: delay.pending,
      reads: requestLines(server)
        .slice(before)
        .filter((request) =>
          request.startsWith(`GET ${buildPath(org, buildA.id)}`),
        ),
    }).toEqual({
      log: { buildId: buildA.id, events: finalLogA, error: null },
      timers: 0,
      reads: [`GET ${buildPath(org, buildA.id)}`],
    })
    computer.stop()
  })

  test('a late answer for an older build keeps the log and the timer of the newer build', async () => {
    const server = new FakeApiServer()
    const { held, delay, computer } = openTab(server)
    const logA = [line(1, 'Cloning 3 repositories into ~/code\n')]
    server.json('GET', buildsPath, {
      builds: [buildA],
      currentImageBuildId: null,
    })
    server.json('GET', buildPath(org, buildA.id), { build: buildA, log: logA })
    // The tab follows the log of A, and reads it on its timer.
    computer.start()
    await flushMicrotasks()
    // The poll of A goes out while A still runs, and its answer comes late.
    held.holdAnswer('GET', buildPath(org, buildA.id))
    const late = delay.runAll()
    // A fails, and Try again starts build B.
    const logB = [line(1, 'Cloning 2 repositories into ~/code\n')]
    server.json('POST', buildsPath, { build: buildB, log: logB }, 202)
    server.json('GET', buildPath(org, buildB.id), { build: buildB, log: logB })
    await computer.startBuild()
    await flushMicrotasks()
    held.release('GET', buildPath(org, buildA.id))
    await late
    await flushMicrotasks()
    const shown = computer.log.get()
    const before = server.requests.length
    await delay.runAll()
    expect({ shown, next: requestLines(server).slice(before) }).toEqual({
      shown: { buildId: buildB.id, events: logB, error: null },
      next: [`GET ${buildPath(org, buildB.id)}`],
    })
    computer.stop()
  })

  test('a log that did not load reads again when the builds show the end of its build', async () => {
    const server = new FakeApiServer()
    const { delay, model, computer } = openTab(server)
    server.json('GET', buildsPath, {
      builds: [buildA],
      currentImageBuildId: null,
    })
    server.json('GET', buildPath(org, buildA.id), refused, 503)
    computer.start()
    await flushMicrotasks()
    const failed = computer.log.get()
    // A fails, and a read of the builds shows its end.
    server.json('GET', buildPath(org, buildA.id), {
      build: endedA,
      log: finalLogA,
    })
    server.json('GET', buildsPath, {
      builds: [endedA],
      currentImageBuildId: null,
    })
    await model.reload('builds')
    await flushMicrotasks()
    expect({
      failed: { events: failed?.events, code: failed?.error?.code },
      log: computer.log.get(),
      timers: delay.pending,
    }).toEqual({
      failed: { events: [], code: 'server_error' },
      log: { buildId: buildA.id, events: finalLogA, error: null },
      timers: 0,
    })
    computer.stop()
  })

  test('a log read that fails after the builds showed the end of its build reads again', async () => {
    const server = new FakeApiServer()
    const { held, delay, model, computer } = openTab(server)
    server.json('GET', buildsPath, {
      builds: [buildA],
      currentImageBuildId: null,
    })
    // The first read of the log fails, and its answer comes late.
    server.json('GET', buildPath(org, buildA.id), refused, 503)
    held.holdAnswer('GET', buildPath(org, buildA.id))
    computer.start()
    await flushMicrotasks()
    // A fails, and a read of the builds shows its end while the log waits.
    server.json('GET', buildsPath, {
      builds: [endedA],
      currentImageBuildId: null,
    })
    await model.reload('builds')
    server.json('GET', buildPath(org, buildA.id), {
      build: endedA,
      log: finalLogA,
    })
    held.holdAnswer('GET', buildPath(org, buildA.id))
    held.release('GET', buildPath(org, buildA.id))
    await flushMicrotasks()
    const failed = computer.log.get()
    held.release('GET', buildPath(org, buildA.id))
    await flushMicrotasks()
    expect({
      failed: { events: failed?.events, code: failed?.error?.code },
      log: computer.log.get(),
      timers: delay.pending,
    }).toEqual({
      failed: { events: [], code: 'server_error' },
      log: { buildId: buildA.id, events: finalLogA, error: null },
      timers: 0,
    })
    computer.stop()
  })
})
