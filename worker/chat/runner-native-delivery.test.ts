import type { WebSocket } from 'miniflare'
import { expect, it } from 'vitest'

import { filePaths } from '../../src/shared/files'
import { chatHistoryPath } from '../../src/shared/events'
import { TEST_ORIGIN } from '../test-support/harness'
import { createAdapterRuntime } from './adapter-runtime.test-support'
import { array } from './agent-events'
import { WORKSPACE_ID } from './harness.test-support'
import { record, string } from './inputs'
import { runnerControls, disposeRunners } from './runner-native.test-support'

it('keeps runner delivery, repairs, ended turns and file ownership through the original socket wake', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/runner-entry.test-support.ts',
  )
  const controls = runnerControls(runtime, headers)
  const sockets: WebSocket[] = []
  const confirm = (throughEventNumber: number) => ({
    type: 'confirm',
    streamId: 'native-runner',
    throughEventNumber,
  })
  try {
    const sessionId = await controls.session()
    await controls.send(sessionId, 'first')
    const runner = await controls.connect()
    sockets.push(runner.socket)
    runner.emit({ type: 'runner.ready' })
    expect(await runner.inbox.next()).toEqual(confirm(1))
    const first = record(await runner.inbox.next())
    expect(first).toMatchObject({
      type: 'turn',
      sessionId,
      message: { id: 'first' },
    })
    runner.emit({
      type: 'start.updated',
      start: { kind: 'create', startedAt: -1, steps: [] },
    })
    const repair = record(await runner.inbox.next())
    expect(repair).toMatchObject({
      type: 'report.refresh',
      kind: 'start.updated',
    })
    expect(await runner.inbox.next()).toEqual(confirm(2))
    const woke = await controls.hibernate()
    expect(woke.hello).toBe(1)
    expect(woke.ready).toBe(1)
    expect(woke.detached).toBe(0)
    const identity = record(array(woke.sockets, record)[0].attachment)
    expect(Object.keys(identity).sort()).toEqual([
      'generation',
      'id',
      'role',
      'version',
    ])
    expect(identity.role).toBe('runner')

    await controls.send(sessionId, 'follow-up')
    const follow = record(await runner.inbox.next())
    expect(follow).toMatchObject({
      type: 'message',
      turnId: first.turnId,
      message: { id: 'follow-up' },
    })
    expect(
      runner.received.filter((value) => record(value).type === 'turn'),
    ).toHaveLength(1)
    expect(
      runner.received.filter(
        (value) => record(value).type === 'report.refresh',
      ),
    ).toEqual([repair])

    const pendingFile = runtime.dispatchFetch(
      `${TEST_ORIGIN}${filePaths.content('org', WORKSPACE_ID, 'src/app.ts')}`,
      { headers },
    )
    const file = record(await runner.inbox.next())
    expect(file).toMatchObject({ type: 'file.read', path: 'src/app.ts' })
    const whilePending = await controls.request('inspect')
    expect(whilePending.instance).toBe(woke.instance)
    runner.socket.send(
      JSON.stringify({
        type: 'file.read.result',
        requestId: file.requestId,
        result: {
          ok: true,
          file: {
            path: 'src/app.ts',
            mediaType: 'text/plain',
            sizeBytes: 4,
            encoding: 'utf-8',
            content: 'wake',
          },
        },
      }),
    )
    const fileResponse = await pendingFile
    expect(fileResponse.status).toBe(200)
    expect(await fileResponse.json()).toMatchObject({
      path: 'src/app.ts',
      content: 'wake',
    })
    runner.emit({
      type: 'turn.completed',
      sessionId,
      turnId: string(first.turnId),
      state: 'finished',
      durationMs: 1,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['first', 'follow-up'],
    })
    expect(await runner.inbox.next()).toEqual(confirm(3))
    await controls.hibernate()
    await controls.send(sessionId, 'next-turn')
    const next = record(await runner.inbox.next())
    expect(next).toMatchObject({ type: 'turn', message: { id: 'next-turn' } })
    expect(next.turnId).not.toBe(first.turnId)
    expect(
      runner.received.filter(
        (value) => record(value).type === 'report.refresh',
      ),
    ).toEqual([repair])

    const replacement = await controls.connect('replacement-stream')
    sockets.push(replacement.socket)
    expect(await runner.closed).toMatchObject({ code: 1000 })
    replacement.emit({ type: 'runner.ready' })
    expect(await replacement.inbox.next()).toEqual(repair)
    expect(await replacement.inbox.next()).toEqual({
      type: 'confirm',
      streamId: 'replacement-stream',
      throughEventNumber: 1,
    })
    const replayed = record(await replacement.inbox.next())
    expect(replayed.commandId).toBe(next.commandId)
    expect(replayed.turnId).toBe(next.turnId)
    const replaced = await controls.hibernate()
    expect(replaced.detached).toBe(1)
    expect(
      array(replaced.sockets, record)
        .filter((socket) => socket.readyState === 1)
        .map((socket) => record(socket.attachment).id),
    ).not.toContain(identity.id)
    const failedFile = runtime.dispatchFetch(
      `${TEST_ORIGIN}${filePaths.content('org', WORKSPACE_ID, 'src/pending.ts')}`,
      { headers },
    )
    expect(await replacement.inbox.next()).toMatchObject({
      type: 'file.read',
      path: 'src/pending.ts',
    })
    const db = await runtime.getD1Database('DB')
    await db.prepare('UPDATE workspace_tokens SET revoked_at = 1').run()
    await controls.send(sessionId, 'after-revocation')
    expect((await failedFile).status).toBe(503)
    await controls.request('close')
    await controls.request('settled')
    expect((await controls.request('inspect')).detached).toBe(2)
    const history = await runtime.dispatchFetch(
      `${TEST_ORIGIN}${chatHistoryPath('org', WORKSPACE_ID, sessionId)}`,
      { headers },
    )
    const events = array(record(await history.json()).events, record)
    expect(
      events.filter((event) => record(event.event).type === 'turn.completed'),
    ).toHaveLength(1)
    expect(
      events
        .filter((event) => record(event.event).type === 'message.sent')
        .map((event) => record(event.event).messageId),
    ).toEqual(['first', 'follow-up', 'next-turn'])
    expect(
      runner.received.filter((value) => record(value).type === 'welcome'),
    ).toHaveLength(1)
  } finally {
    await disposeRunners(runtime, sockets)
  }
})
