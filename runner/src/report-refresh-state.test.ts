import { expect, it, onTestFinished, vi } from 'vitest'
import type { RunnerEvent } from '../../src/shared/generated/RunnerEvent'
import { refresh, reportSnapshot } from '../test-support/reports'
import { deferred } from '../test-support/runtime'
import { wireFixture } from '../test-support/wire'
import { Runner } from './runner'
import { EventStore } from './state'

it('retains the last start and name reports after confirms and restarts and repeats each request once', async () => {
  const h = await wireFixture()
  await h.runner.start(false)
  h.endpoint.send(refresh('start.updated', 'no-start-yet'))
  h.endpoint.send(refresh('workspace.title', 'no-name-yet'))
  await h.runner.idle()
  expect(h.endpoint.runnerEvents).toHaveLength(3)
  const start: RunnerEvent = {
    type: 'start.updated',
    start: {
      kind: 'resume',
      startedAt: 90,
      steps: [
        {
          id: 'setup',
          label: 'Prepare wire-token',
          state: 'completed',
          startedAt: 90,
          completedAt: 100,
        },
      ],
    },
  }
  const title: RunnerEvent = {
    type: 'workspace.title',
    name: 'Last wire-token',
  }
  await h.runner.link.emit({ type: 'workspace.title', name: 'Old name' })
  await h.runner.link.emit({
    type: 'start.updated',
    start: { kind: 'resume', startedAt: 90, steps: [] },
  })
  await h.runner.link.emit(start)
  await h.runner.link.emit(title)
  await h.runner.idle()
  expect(h.store.snapshot.outbox).toEqual([])
  await h.runner.close()
  const store = await EventStore.open(h.storage)
  const runner = new Runner({ ...h.options, store })
  onTestFinished(() => runner.close())
  await runner.start(false)
  const before = h.endpoint.runnerEvents.length
  const startRequest = refresh('start.updated')
  const titleRequest = refresh('workspace.title')
  h.endpoint.send(startRequest)
  h.endpoint.send(titleRequest)
  h.endpoint.send(startRequest)
  h.endpoint.send(titleRequest)
  await runner.idle()
  expect(
    h.endpoint.runnerEvents.slice(before).map(({ event }) => event),
  ).toEqual([
    {
      type: 'start.updated',
      start: {
        kind: 'resume',
        startedAt: 90,
        steps: [
          {
            id: 'setup',
            label: 'Prepare [redacted]',
            state: 'completed',
            startedAt: 90,
            completedAt: 100,
          },
        ],
      },
    },
    { type: 'workspace.title', name: 'Last [redacted]' },
  ])
  h.endpoint.send(startRequest)
  h.endpoint.send(titleRequest)
  await runner.idle()
  expect(h.endpoint.runnerEvents).toHaveLength(before + 2)
  h.endpoint.disconnect()
  await runner.connect()
  const reconnected = h.endpoint.runnerEvents.length
  h.endpoint.send(startRequest)
  h.endpoint.send(titleRequest)
  await runner.idle()
  expect(h.endpoint.runnerEvents).toHaveLength(reconnected)
  await runner.close()
  const restarted = new Runner({
    ...h.options,
    store: await EventStore.open(h.storage),
  })
  onTestFinished(() => restarted.close())
  await restarted.start(false)
  const afterRestart = h.endpoint.runnerEvents.length
  h.endpoint.send(startRequest)
  h.endpoint.send(titleRequest)
  await restarted.idle()
  expect(h.endpoint.runnerEvents).toHaveLength(afterRestart)
  expect(h.warnings).toEqual([])
})

it('does not repeat a saved full report after restart before its refresh handler returns', async () => {
  const h = await wireFixture()
  await h.runner.start(false)
  h.setSnapshot(
    reportSnapshot(
      Array.from({ length: 6 }, (_, index) => 'x'.repeat(90_000) + index),
    ),
  )
  const saved = deferred<void>()
  const release = deferred<void>()
  const emit = h.runner.link.emit.bind(h.runner.link)
  vi.spyOn(h.runner.link, 'emit').mockImplementation(async (...arguments_) => {
    await emit(...arguments_)
    const [event] = arguments_
    if (
      event.type === 'files.snapshot' &&
      event.tree.revision === 2 &&
      event.tree.partNumber === event.tree.partCount
    ) {
      saved.resolve()
      await release.promise
    }
  })
  const request = refresh('files.snapshot', 'saved-replacement')
  h.endpoint.send(request)
  let restarted: Runner | null = null
  try {
    await saved.promise
    await h.runner.link.idle()
    await h.runner.close()
    const store = await EventStore.open(h.storage)
    restarted = new Runner({ ...h.options, store })
    await restarted.start(false)
    const before = h.endpoint.runnerEvents.length
    h.endpoint.send(request)
    await restarted.idle()
    expect(
      h.endpoint.runnerEvents.slice(before).map(({ event }) => event.type),
    ).toEqual([])
    expect(store.snapshot.fileRevisions).toEqual({ tree: 3, changes: 2 })
    expect(h.warnings).toEqual([])
  } finally {
    release.resolve()
    await h.runner.idle()
    await restarted?.close()
  }
})
