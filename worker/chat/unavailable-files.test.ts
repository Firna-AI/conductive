import { expect, it } from 'vitest'

import { FilesState } from '../files/state'
import { createRunnerLimitsFixture } from './runner-limits.test-support'
import { context, file, snapshot } from './runner-fixtures.test-support'

it('persists unavailable files and cached trees through receipt, replay, and recovery', async () => {
  const h = await createRunnerLimitsFixture()
  const tree = () => h.read((view) => new FilesState(view.files).tree())
  await h.receive(1, { type: 'files.unavailable' })
  expect(await tree()).toEqual({ revision: 0, entries: [], unavailable: true })
  await h.receive(2, snapshot(1, 1, 1, ['cached.ts']))
  await h.receive(3, { type: 'files.unavailable' })
  await h.connect('stream', true)
  await h.receive(3, { type: 'files.unavailable' })
  expect(await tree()).toEqual({
    revision: 1,
    entries: [file('cached.ts')],
    unavailable: true,
  })
  await h.receive(4, {
    type: 'files.changed',
    delta: {
      revision: 2,
      changes: [{ operation: 'upsert', entry: file('delta.ts') }],
    },
  })
  await h.receive(5, snapshot(3, 1, 2, ['new.ts']))
  expect(await tree()).toEqual({
    revision: 2,
    entries: [file('cached.ts'), file('delta.ts')],
    unavailable: true,
  })
  await h.receive(6, snapshot(3, 2, 2, ['other.ts']))
  expect(await tree()).toEqual({
    revision: 3,
    entries: [file('new.ts'), file('other.ts')],
  })
  await h.receive(7, {
    ...context,
    type: 'turn.completed',
    state: 'finished',
    durationMs: 1,
    files: [],
    filesUnavailable: true,
    omittedFileCount: 0,
    userMessageIds: [],
  })
  await h.connect('stream', true)
  const history = await h.history()
  expect(
    history.events.filter(({ event }) => event.type === 'files.unavailable'),
  ).toHaveLength(2)
  expect(
    history.events.find(({ event }) => event.type === 'turn.completed')?.event,
  ).toMatchObject({
    type: 'turn.completed',
    state: 'finished',
    filesUnavailable: true,
  })
  expect(h.sent.at(-1)).toMatchObject({ type: 'welcome', confirmedThrough: 7 })
})
