import type { WebSocket } from 'miniflare'
import { expect, it } from 'vitest'

import { filePaths } from '../../src/shared/files'
import {
  changedRow,
  changesDelta,
  fullChanges,
} from '../files/changes-delta.test-support'
import { TEST_ORIGIN } from '../test-support/harness'
import { createAdapterRuntime } from './adapter-runtime.test-support'
import {
  browserControls,
  seedBrowserRuntime,
} from './browser-native.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { number, record } from './inputs'
import { disposeRunners, runnerControls } from './runner-native.test-support'
import { snapshot } from './runner-fixtures.test-support'

it('delivers changes in both socket forms across a wake and replay with the same event numbers', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/runner-entry.test-support.ts',
  )
  const browsers = browserControls(runtime, headers)
  const runners = runnerControls(runtime, headers)
  const sockets: WebSocket[] = []
  try {
    await seedBrowserRuntime(runtime)
    const runner = await runners.connect()
    sockets.push(runner.socket)
    const tab = await browsers.open(TEST_ORIGIN, {
      forms: 'future,changes.changed',
    })
    sockets.push(tab.socket)
    const older = await browsers.open(TEST_ORIGIN, { forms: null })
    sockets.push(older.socket)
    const base = number(record(record(tab.history).history).throughEventNumber)
    expect(older.history).toEqual(tab.history)
    const full = (revision: number, added: number) => ({
      type: 'changes.updated',
      changes: {
        revision,
        baseBranch: 'main',
        files: [changedRow('file.txt', added)],
        summary: { files: 1, added, removed: 0 },
        omitted: { files: 0, added: 0, removed: 0 },
      },
    })
    const envelope = (event: unknown, offset: number) => ({
      workspaceId: WORKSPACE_ID,
      occurredAt: 1_800_000_000_000 + offset,
      eventNumber: base + offset,
      event,
    })
    const live = (event: unknown, offset: number) => ({
      type: 'event',
      envelope: envelope(event, offset),
    })
    const confirm = async (throughEventNumber: number) =>
      expect(await runner.inbox.next()).toEqual({
        type: 'confirm',
        streamId: 'native-runner',
        throughEventNumber,
      })
    runner.emit(fullChanges({ omitted: { files: 0, added: 0, removed: 0 } }))
    await confirm(1)
    expect(await tab.inbox.next()).toEqual(live(full(1, 1), 1))
    expect(await older.inbox.next()).toEqual(live(full(1, 1), 1))

    const update = (revision: number, added: number) =>
      changesDelta({
        revision,
        upserts: [{ index: 0, file: changedRow('file.txt', added) }],
        summary: { files: 1, added, removed: 0 },
      })
    const beforeWake = update(2, 2)
    const sent = runner.emit(beforeWake)
    await confirm(2)
    expect(await tab.inbox.next()).toEqual(live(beforeWake, 2))
    expect(await older.inbox.next()).toEqual(live(full(2, 2), 2))
    runner.resend(sent)
    await confirm(2)

    await runners.hibernate()
    const afterWake = update(3, 3)
    runner.emit(afterWake)
    await confirm(3)
    expect(await tab.inbox.next()).toEqual(live(afterWake, 3))
    expect(await older.inbox.next()).toEqual(live(full(3, 3), 3))

    const response = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${filePaths.changes('org', WORKSPACE_ID)}`,
      { headers },
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      ...full(3, 3).changes,
      stateRead: { eventNumber: base + 3 },
    })

    const reopen = async (forms: string | null, after = base + 1) => {
      const connection = await browsers.open(TEST_ORIGIN, { after, forms })
      sockets.push(connection.socket)
      return connection
    }
    const replayed = await reopen('changes.changed')
    const olderReplay = await reopen(null)
    const history = (events: unknown[], through = base + 3) => ({
      type: 'history',
      history: { events, throughEventNumber: through },
    })
    expect(replayed.history).toEqual(history([envelope(afterWake, 3)]))
    expect(olderReplay.history).toEqual(history([envelope(full(3, 3), 3)]))

    await runners.request('mark-files-moved', { workspaceId: WORKSPACE_ID })
    expect((await reopen(null)).history).toEqual(history([]))
    expect((await reopen('changes.changed')).history).toEqual(
      history([envelope(afterWake, 3)]),
    )

    runner.emit(snapshot(1, 1, 1, []))
    await confirm(4)
    const tree = live(
      { type: 'files.snapshot', tree: { revision: 1, entries: [] } },
      4,
    )
    for (const connection of [tab, older, replayed, olderReplay])
      expect(await connection.inbox.next()).toEqual(tree)
    expect(tab.inbox.received).toEqual([
      tab.history,
      live(full(1, 1), 1),
      live(beforeWake, 2),
      live(afterWake, 3),
      tree,
    ])
    expect(older.inbox.received).toEqual([
      older.history,
      live(full(1, 1), 1),
      live(full(2, 2), 2),
      live(full(3, 3), 3),
      tree,
    ])
    expect(replayed.inbox.received).toEqual([replayed.history, tree])
    expect(olderReplay.inbox.received).toEqual([olderReplay.history, tree])
  } finally {
    await disposeRunners(runtime, sockets)
  }
})
