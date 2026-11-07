import { expect, it, vi } from 'vitest'

import type { RunnerEvent } from '../../src/shared/runner'
import { refresh } from '../test-support/reports'
import { deferred } from '../test-support/runtime'
import { wireFixture } from '../test-support/wire'
import { EventStore } from './state'

it('refreshes the newest start and name while their normal report saves are pending', async () => {
  const h = await wireFixture()
  await h.runner.start(false)
  await h.runner.link.emit({
    type: 'start.updated',
    start: { kind: 'resume', startedAt: 90, steps: [] },
  })
  await h.runner.link.emit({ type: 'workspace.title', name: 'Old name' })
  await h.runner.idle()
  const start: RunnerEvent = {
    type: 'start.updated',
    start: {
      kind: 'resume',
      startedAt: 90,
      steps: [
        {
          id: 'setup',
          label: 'Prepare the repository',
          state: 'completed',
          startedAt: 90,
          completedAt: 100,
        },
      ],
    },
  }
  const title: RunnerEvent = { type: 'workspace.title', name: 'New name' }
  const writing = deferred<void>()
  const release = deferred<void>()
  const write = h.storage.write.bind(h.storage)
  let held = false
  vi.spyOn(h.storage, 'write').mockImplementation(async (state) => {
    if (!held && state.outbox.at(-1)?.event.type === 'start.updated') {
      held = true
      writing.resolve()
      await release.promise
    }
    await write(state)
  })
  const before = h.endpoint.runnerEvents.length
  const startSave = h.runner.link.emit(start)
  await writing.promise
  const titleSave = h.runner.link.emit(title)
  try {
    h.endpoint.send(refresh('start.updated', 'pending-start'))
    h.endpoint.send(refresh('workspace.title', 'pending-title'))
    await h.runner.link.idle()
    expect(h.endpoint.runnerEvents.slice(before)).toEqual([])
  } finally {
    release.resolve()
    await Promise.all([startSave, titleSave])
    await h.runner.idle()
  }
  expect(
    h.endpoint.runnerEvents.slice(before).map(({ event }) => event),
  ).toEqual([start, title, start, title])
  const restored = await EventStore.open(h.storage)
  expect(restored.snapshot.reports.latest).toEqual({
    'start.updated': start,
    'workspace.title': title,
  })
  expect(restored.snapshot.reports.commands).toEqual([
    'pending-start',
    'pending-title',
  ])
  expect(h.warnings).toEqual([])
})
