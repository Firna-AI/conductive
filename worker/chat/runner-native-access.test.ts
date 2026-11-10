import type { WebSocket } from 'miniflare'
import { expect, it } from 'vitest'

import { createAdapterRuntime } from './adapter-runtime.test-support'
import { array } from './agent-events'
import { BROWSER_TEST_NOW } from './browser-clock.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { record, number } from './inputs'
import {
  runnerControls,
  disposeRunners,
  runnerState,
} from './runner-native.test-support'

it('retains the runner token deadline through wake and lifecycle fences and authorizes a Mac ping normally', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/runner-entry.test-support.ts',
  )
  const controls = runnerControls(runtime, headers)
  const sockets: WebSocket[] = []
  const db = await runtime.getD1Database('DB')
  try {
    let now = BROWSER_TEST_NOW
    for (const mode of [
      'suspended',
      'purged',
      'stale',
      'deleted',
      'read',
      'write',
      'access',
      'ping',
    ] as const) {
      await controls.request('failure', { mode: '' })
      await controls.request('fail', { fail: false })
      await controls.request('seed', {
        values: { 'members:lifecycle-fence': null },
      })
      await db.batch([
        db.prepare('UPDATE workspace_tokens SET revoked_at = NULL'),
        db.prepare('UPDATE orgs SET deleted_at = NULL'),
      ])
      await controls.request('clock', { now })
      const runner = await controls.connect(`token-${mode}`)
      sockets.push(runner.socket)
      const admitted = await controls.request('settled')
      await controls.request('clock', { now: now + 5_000 })
      const woke = await controls.hibernate()
      expect(runnerState(woke.state).get('alarm:runner'), mode).toBe(
        now + 15_000,
      )
      expect(woke.autoResponse, mode).toBeNull()
      expect(woke.hello, mode).toBe(admitted.hello)
      expect(woke.ready, mode).toBe(admitted.ready)
      await controls.request('seed', {
        values: {
          'members:lifecycle-fence': {
            orgId: 'org',
            generation: 100,
            mode: mode === 'suspended' || mode === 'purged' ? mode : 'active',
          },
        },
      })
      if (mode === 'read' || mode === 'write')
        await controls.request('failure', { mode })
      if (mode === 'access') await controls.request('fail', { fail: true })
      else await db.prepare('UPDATE workspace_tokens SET revoked_at = 1').run()
      if (mode === 'deleted')
        await db.prepare('UPDATE orgs SET deleted_at = 1').run()
      const at = now + 15_000
      await controls.request('seed', { values: { 'alarm:github': at } })
      await controls.request('clock', { now: at })
      if (mode === 'ping') runner.socket.send('{"type":"device.ping"}')
      else {
        await controls.request('arm')
        await controls.request('observed', { count: 1 })
      }
      expect(await runner.closed, mode).toMatchObject({ code: 1000 })
      const ended = await controls.request('drain')
      expect(ended.detached, mode).toBe(number(admitted.detached) + 1)
      expect(ended.reads, mode).toBe(number(woke.reads) + 1)
      expect(
        runner.received.map((value) => record(value).type),
        mode,
      ).toEqual(['welcome'])
      if (mode !== 'ping') {
        const state = new Map(
          array(ended.state, (entry): [string, unknown] => {
            const pair = array(entry, (value) => value)
            return [String(pair[0]), pair[1]]
          }),
        )
        expect(state.get('alarm:github'), mode).toBe(at)
        expect(state.get('members:lifecycle-fence'), mode).toEqual({
          orgId: 'org',
          generation: 100,
          mode: mode === 'suspended' || mode === 'purged' ? mode : 'active',
        })
      }
      now += 60_000
    }
  } finally {
    await disposeRunners(runtime, sockets)
  }
})

it('returns from native runner alarms while an access read waits and retains its security retry', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/runner-entry.test-support.ts',
  )
  const controls = runnerControls(runtime, headers)
  const sockets: WebSocket[] = []
  try {
    const runner = await controls.connect()
    sockets.push(runner.socket)
    await controls.hibernate()
    await controls.request('hold')
    await controls.request('clock', { now: BROWSER_TEST_NOW + 15_000 })
    await controls.request('arm')
    await controls.request('entered')
    expect(
      (await controls.request('observed', { count: 1 })).alarmsCompleted,
    ).toBe(1)
    await controls.request('clock', { now: BROWSER_TEST_NOW + 17_000 })
    await controls.request('arm')
    const waiting = await controls.request('observed', { count: 2 })
    const state = new Map(
      array(waiting.state, (entry): [string, unknown] => {
        const pair = array(entry, (value) => value)
        return [String(pair[0]), pair[1]]
      }),
    )
    expect(state.get('alarm:runner')).toBe(BROWSER_TEST_NOW + 19_000)
    expect(
      array(waiting.sockets, record).map((socket) => socket.readyState),
    ).toEqual([1])
    const db = await runtime.getD1Database('DB')
    await db
      .prepare(
        'UPDATE workspace_tokens SET revoked_at = 1 WHERE workspace_id = ?',
      )
      .bind(WORKSPACE_ID)
      .run()
    await controls.request('release')
    expect(await runner.closed).toMatchObject({ code: 1000 })
    const ended = await controls.request('settled')
    expect(ended.detached).toBe(1)
    expect(runner.received.map((value) => record(value).type)).toEqual([
      'welcome',
    ])
  } finally {
    await controls.request('release')
    await disposeRunners(runtime, sockets)
  }
})
