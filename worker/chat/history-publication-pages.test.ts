import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { continueFixture } from '../lifecycle/continue.test-support'
import {
  CONTINUE_JOB_KEY,
  continueJobKey,
  type ContinueJob,
} from '../lifecycle/continue-types'
import { repositoryChangeFixture } from '../lifecycle/repository-change.test-support'
import {
  REPOSITORY_CHANGE_JOB_KEY,
  repositoryChangeJobKey,
  type RepositoryChangeJob,
} from '../lifecycle/repository-change-types'
import { createHarness, type TestHarness } from '../test-support/harness'
import { WORKSPACE_ID } from './harness.test-support'
import { seedHistory } from './history-memory.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})

it.each(['continue', 'repository-change'] as const)(
  'replays %s publication in order through its captured cutoff across three forward pages',
  async (kind) => {
    const fixture =
      kind === 'continue'
        ? await continueFixture(harness)
        : await repositoryChangeFixture(harness)
    await fixture.createSession()
    const pending = await fixture.start()
    if (pending.state !== 'pending') throw new Error('Expected a pending job.')
    const key =
      'continueId' in pending
        ? continueJobKey(pending.continueId)
        : repositoryChangeJobKey(pending.changeId)
    const activeKey =
      kind === 'continue' ? CONTINUE_JOB_KEY : REPOSITORY_CHANGE_JOB_KEY
    const job = await fixture.storage.get<ContinueJob | RepositoryChangeJob>(
      key,
    )
    if (!job) throw new Error('Expected a reserved job.')
    await fixture.storage.put(activeKey, { ...job, phase: 'publish' })
    const { controls } = fixture.actor.api
    await controls.takePublications()
    const publish = async () => {
      await fixture.storage.put(`alarm:${kind}`, fixture.clock.now())
      await controls.dispatchAlarm()
      await fixture.drain()
    }
    await publish()
    const published = await controls.takePublications()
    const note = published[1]?.event
    if (
      note?.type !== 'workspace.continued' &&
      note?.type !== 'workspace.repository-changed'
    )
      throw new Error('Expected a stored publication note.')
    expect(published.map(({ event }) => event.type)).toEqual([
      'workspace.updated',
      kind === 'continue'
        ? 'workspace.continued'
        : 'workspace.repository-changed',
    ])
    const saved = await fixture.storage.get<ContinueJob | RepositoryChangeJob>(
      key,
    )
    if (!saved?.publication)
      throw new Error('Expected a committed publication range.')
    const originalThrough = saved.publication.through
    const laterNotes = Array.from({ length: 4_100 }, (_, index) => ({
      ...note,
      sessionId: `session-${index}`,
    }))
    const { through } = await seedHistory(
      fixture.storage,
      WORKSPACE_ID,
      fixture.clock.now(),
      laterNotes,
    )
    await seedHistory(fixture.storage, WORKSPACE_ID, fixture.clock.now(), [
      { ...note, sessionId: 'after-cutoff' },
    ])
    const replaying = {
      ...saved,
      publication: { ...saved.publication, through },
    }
    await fixture.storage.put(key, replaying)
    await fixture.storage.put(activeKey, replaying)
    await publish()

    const replay = await controls.takePublications()
    expect(replay).toHaveLength(4_102)
    expect(replay.slice(0, 2)).toEqual(published)
    expect(
      replay.slice(2).map(({ eventNumber, event }) => [eventNumber, event]),
    ).toEqual(
      laterNotes.map((event, index) => [originalThrough + index + 1, event]),
    )
  },
)
