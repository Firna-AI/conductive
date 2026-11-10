import { describe, expect, test } from 'vitest'
import { FAKE_TIME } from '../test-support/fixtures/core'
import {
  archivedAt,
  paths,
  reply,
  restoredAt,
  stoppedWorkspace,
} from './restore-test-kit'

describe('Archive and Restore during the visits of the open workspace', () => {
  test('a late Archive reply of an earlier visit, which the Restore of another member overtook, does not stop the Resume of the next open', async () => {
    const { server, held, workspace, updated, states, resumes } =
      await stoppedWorkspace()
    await workspace.open()
    server.json('POST', paths.archive, reply(archivedAt(FAKE_TIME + 1)))
    held.holdAnswer('POST', paths.archive)
    const archiving = workspace.archive.archive()
    updated(archivedAt(FAKE_TIME + 1))
    updated(restoredAt(FAKE_TIME + 2))
    workspace.close()
    const before = resumes().length
    server.json('GET', paths.read, {
      ...reply(restoredAt(FAKE_TIME + 2)),
      eventNumber: 2,
    })
    held.holdAnswer('GET', paths.read)
    const opening = workspace.open()
    held.release('POST', paths.archive)
    await archiving
    held.release('GET', paths.read)
    await opening
    expect({ states: states(), resumes: resumes().length - before }).toEqual({
      states: { detail: 'stopped', row: 'stopped' },
      resumes: 1,
    })
    workspace.close()
  })

  test('an Archive and its Restore while the first read waits resume nothing, keep their detail and the stream when the read fails, stay over an older replay, and the next open resumes', async () => {
    const { server, held, workspace, updated, replay, states, resumes } =
      await stoppedWorkspace()
    held.holdAnswer('GET', paths.read)
    const opening = workspace.open()
    await workspace.archive.archive()
    await workspace.archive.restore()
    held.release('GET', paths.read)
    await opening
    const read = { states: states(), resumes: resumes().length }
    workspace.close()
    // In the next visit, the read fails after the Archive and the Restore.
    server.json('POST', paths.archive, reply(archivedAt(FAKE_TIME + 3)))
    server.json('POST', paths.restore, reply(restoredAt(FAKE_TIME + 4)))
    held.hold('GET', paths.read)
    const failing = workspace.open()
    await workspace.archive.archive()
    await workspace.archive.restore()
    const failure = { error: { code: 'busy', message: 'Busy.' } }
    server.json('GET', paths.read, failure, 503)
    held.release('GET', paths.read)
    await failing
    const failed = {
      detail: workspace.detail.get().state,
      states: states(),
      resumes: resumes().length,
    }
    // The new connection has no read, so it replays an active record from
    // before the Archive, and then that older Archive.
    replay(
      { ...restoredAt(FAKE_TIME + 2), state: 'ready' },
      archivedAt(FAKE_TIME + 3),
    )
    const replayed = states()
    // The visit follows the stream, so a Resume shows its later events.
    const starting = {
      ...restoredAt(FAKE_TIME + 5),
      state: 'starting' as const,
    }
    server.json('POST', paths.resume, { ...reply(starting), eventNumber: 2 })
    await workspace.resume()
    updated({ ...starting, state: 'ready', updatedAt: FAKE_TIME + 6 })
    const followed = { states: states(), resumes: resumes().length }
    workspace.close()
    // The workspace stopped again before the next open.
    const stoppedAgain = restoredAt(FAKE_TIME + 7)
    server.json('GET', paths.read, { ...reply(stoppedAgain), eventNumber: 3 })
    await workspace.open()
    expect({
      read,
      failed,
      replayed,
      followed,
      reopened: resumes().length,
    }).toEqual({
      read: { states: { detail: 'stopped', row: 'stopped' }, resumes: 0 },
      failed: {
        detail: 'ready',
        states: { detail: 'stopped', row: 'stopped' },
        resumes: 0,
      },
      replayed: { detail: 'stopped', row: 'stopped' },
      followed: { states: { detail: 'ready', row: 'ready' }, resumes: 1 },
      reopened: 2,
    })
    workspace.close()
  })

  test('a first read that fails with no Archive or Restore shows its failure and follows no stream', async () => {
    const { server, workspace, streams } = await stoppedWorkspace()
    const failure = { error: { code: 'busy', message: 'Busy.' } }
    server.json('GET', paths.read, failure, 503)
    await workspace.open()
    expect({
      detail: workspace.detail.get().state,
      streams: streams(),
    }).toEqual({ detail: 'failed', streams: 0 })
    workspace.close()
  })
})
