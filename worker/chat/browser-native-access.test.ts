import type { WebSocket } from 'miniflare'
import { expect, it } from 'vitest'

import { createAdapterRuntime } from './adapter-runtime.test-support'
import { array } from './agent-events'
import { record, number } from './inputs'
import { BROWSER_TEST_NOW } from './browser-clock.test-support'
import {
  browserControls,
  closeBrowserPeers,
  disposeBrowsers,
  seedBrowserRuntime,
} from './browser-native.test-support'
import { WORKSPACE_ID } from './harness.test-support'

it('restores browser access clocks through member fences and keeps suspended org history readable', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/browser-entry.test-support.ts',
  )
  const sockets: WebSocket[] = []
  const controls = browserControls(runtime, headers)
  const db = await runtime.getD1Database('DB')
  try {
    await seedBrowserRuntime(runtime)
    await db
      .prepare("UPDATE workspaces SET state = 'stopped', archived_at = 1")
      .run()
    await db.prepare('UPDATE orgs SET suspended_at = 1').run()
    const readable = await controls.open()
    sockets.push(readable.socket)
    const before = await controls.request('inspect')
    const woke = await controls.hibernate()
    expect(woke.instance).not.toBe(before.instance)
    expect(
      array(woke.sockets, record).map((socket) => socket.readyState),
    ).toEqual([1])
    await controls.request('clock', { now: BROWSER_TEST_NOW + 15_000 })
    await controls.request('arm')
    await controls.request('observed', { count: 1 })
    await controls.request('settled')
    await controls.request('publish', { workspaceId: WORKSPACE_ID })
    expect(await readable.inbox.next()).toMatchObject({
      type: 'event',
      envelope: {
        eventNumber: 1,
        event: {
          type: 'workspace.updated',
          workspace: { state: 'stopped', archivedAt: 1 },
        },
      },
    })
    expect(
      readable.inbox.received.map((message) => record(message).type),
    ).toEqual(['history', 'event'])
    await closeBrowserPeers(runtime, headers, readable.socket)
    await db.prepare('UPDATE orgs SET suspended_at = NULL').run()
    await db
      .prepare("UPDATE workspaces SET state = 'ready', archived_at = NULL")
      .run()

    let now = BROWSER_TEST_NOW + 60_000
    for (const mode of [
      'suspended',
      'purged',
      'stale',
      'deleted',
      'expired',
    ] as const) {
      await controls.request('seed', {
        values: { 'members:lifecycle-fence': null },
      })
      await db.batch([
        db.prepare('UPDATE orgs SET deleted_at = NULL'),
        db.prepare(
          "INSERT OR IGNORE INTO sessions (id, user_id, expires_at) VALUES ('session', 'owner', 4000000000000)",
        ),
      ])
      await controls.request('clock', { now })
      const tab = await controls.open()
      sockets.push(tab.socket)
      const admitted = await controls.request('inspect')
      const at = now + (mode === 'expired' ? 30_000 : 15_000)
      await controls.request('clock', { now: at })
      if (mode !== 'expired') {
        await db.prepare("DELETE FROM sessions WHERE id = 'session'").run()
        await controls.request('seed', {
          values: {
            'members:lifecycle-fence': {
              orgId: 'org',
              generation: 100,
              mode: mode === 'suspended' || mode === 'purged' ? mode : 'active',
            },
            'alarm:github': at,
          },
        })
        if (mode === 'deleted')
          await db.prepare('UPDATE orgs SET deleted_at = 1').run()
      }
      const restored = await controls.hibernate()
      expect(restored.instance, mode).not.toBe(admitted.instance)
      if (mode !== 'expired') {
        expect(
          array(restored.sockets, record).map((socket) => socket.readyState),
          mode,
        ).toEqual([1])
        await controls.request('arm')
        await controls.request('observed', { count: 1 })
        await controls.request('settled')
      }
      await controls.request('closed', { count: number(admitted.closed) + 1 })
      const ended = await controls.request('inspect')
      expect(ended.registrations, mode).toEqual([])
      expect(ended.closed, mode).toBe(number(admitted.closed) + 1)
      expect(ended.opened, mode).toBe(admitted.opened)
      expect(ended.reads, mode).toBe(
        number(admitted.reads) + (mode === 'expired' ? 0 : 1),
      )
      expect(tab.inbox.received, mode).toEqual([tab.history])
      if (mode !== 'expired') {
        const state = new Map(
          array(ended.state, (entry): [string, unknown] => {
            const pair = array(entry, (item) => item)
            return [String(pair[0]), pair[1]]
          }),
        )
        expect(state.get('alarm:github'), mode).toBe(at)
      }
      now += 60_000
    }
  } finally {
    await disposeBrowsers(runtime, sockets)
  }
})

it('expires the original browser socket with native alarms while access and lifecycle work wait', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/browser-entry.test-support.ts',
  )
  const controls = browserControls(runtime, headers)
  const sockets: WebSocket[] = []
  try {
    const tab = await controls.open()
    sockets.push(tab.socket)
    const before = await controls.request('inspect')
    const restored = await controls.hibernate()
    expect(restored.instance).not.toBe(before.instance)
    expect(
      array(restored.sockets, record).map((socket) => socket.readyState),
    ).toEqual([1])
    await controls.request('hold')
    await controls.request('lifecycle-hold')
    await controls.request('device-hold')
    await controls.request('clock', { now: BROWSER_TEST_NOW + 15_000 })
    await controls.request('seed', {
      values: {
        'alarm:lifecycle': BROWSER_TEST_NOW + 15_000,
        'alarm:devices': BROWSER_TEST_NOW + 15_000,
      },
    })
    await controls.request('arm')
    await controls.request('entered')
    await controls.request('lifecycle-entered')
    await controls.request('device-entered')
    const first = await controls.request('observed', { count: 1 })
    expect(first.alarmsCompleted).toBe(1)
    expect(number(first.alarm)).toBeGreaterThan(BROWSER_TEST_NOW + 15_000)
    expect(number(first.alarm)).toBeLessThanOrEqual(BROWSER_TEST_NOW + 30_000)
    expect(
      array(first.registrations, record).map(
        (registration) => registration.deadline,
      ),
    ).toEqual([BROWSER_TEST_NOW + 30_000])
    expect(first.lifecycleHeld).toBe(true)
    await controls.request('clock', { now: BROWSER_TEST_NOW + 30_000 })
    await controls.request('arm')
    await controls.request('observed', { count: 2 })
    await controls.request('closed', { count: 1 })
    const expired = await controls.request('inspect')
    expect(expired.registrations).toEqual([])
    expect(expired.lifecycleHeld).toBe(true)
    expect(expired.deviceHeld).toBe(true)
    const securityState = new Map(
      array(expired.state, (entry): [string, unknown] => {
        const pair = array(entry, (item) => item)
        return [String(pair[0]), pair[1]]
      }),
    )
    expect(securityState.has('alarm:devices')).toBe(true)
    expect(number(securityState.get('alarm:devices'))).toBeGreaterThan(
      BROWSER_TEST_NOW + 30_000,
    )
    expect(expired.closed).toBe(1)
    await controls.request('release')
    await controls.request('lifecycle-release')
    await controls.request('device-release')
    await controls.request('settled')
    const ended = await controls.request('inspect')
    expect(ended.registrations).toEqual([])
    expect(ended.closed).toBe(1)
    expect(tab.inbox.received).toEqual([tab.history])
  } finally {
    await controls.request('release')
    await controls.request('lifecycle-release')
    await controls.request('device-release')
    await disposeBrowsers(runtime, sockets)
  }
})

it('keeps native browser expiry independent of failed lifecycle reads and writes', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/browser-entry.test-support.ts',
  )
  const controls = browserControls(runtime, headers)
  const sockets: WebSocket[] = []
  try {
    let now = BROWSER_TEST_NOW
    for (const failure of ['read', 'write', 'access'] as const) {
      const db = await runtime.getD1Database('DB')
      await db
        .prepare("UPDATE sessions SET expires_at = ? WHERE id = 'session'")
        .bind(now + 30_000)
        .run()
      await controls.request('clock', { now })
      const tab = await controls.open()
      sockets.push(tab.socket)
      const before = await controls.request('inspect')
      const woke = await controls.hibernate()
      expect(woke.instance).not.toBe(before.instance)
      expect(
        array(woke.sockets, record).map((socket) => socket.readyState),
      ).toEqual([1])
      await controls.request('failure', { mode: failure })
      if (failure === 'access') await controls.request('fail', { fail: true })
      await controls.request('clock', { now: now + 15_000 })
      await controls.request('seed', {
        values: { 'alarm:lifecycle': now + 15_000 },
      })
      await controls.request('arm')
      await controls.request('observed', { count: 1 })
      if (failure !== 'access') {
        await controls.request('clock', { now: now + 30_000 })
        await controls.request('arm')
        await controls.request('observed', { count: 2 })
      }
      await controls.request('closed', { count: number(before.closed) + 1 })
      const ended = await controls.request('inspect')
      expect(ended.registrations, failure).toEqual([])
      expect(ended.closed, failure).toBe(number(before.closed) + 1)
      expect(tab.inbox.received, failure).toEqual([tab.history])
      await controls.request('failure', { mode: '' })
      await controls.request('fail', { fail: false })
      now += 60_000
    }
  } finally {
    await disposeBrowsers(runtime, sockets)
  }
})
