import type { WebSocket } from 'miniflare'
import { expect, it } from 'vitest'

import { createAdapterRuntime } from './adapter-runtime.test-support'
import { BROWSER_TEST_NOW } from './browser-clock.test-support'
import { browserControls, disposeBrowsers } from './browser-native.test-support'
import type { Workspace } from './browser-entry.test-support'
import { WORKSPACE_ID } from './harness.test-support'
import { array } from './agent-events'
import { record, number } from './inputs'

const state = (value: unknown) =>
  new Map(
    array(value, (entry): [string, unknown] => {
      const pair = array(entry, (item) => item)
      return [String(pair[0]), pair[1]]
    }),
  )

it('keeps a late browser admission scheduled through real member suspension and clears drained regular work', async () => {
  const { runtime, headers } = await createAdapterRuntime(
    'worker/chat/browser-entry.test-support.ts',
  )
  const controls = browserControls(runtime, headers)
  const sockets: WebSocket[] = []
  try {
    const current = await controls.open()
    sockets.push(current.socket)
    await controls.request('seed', {
      values: {
        'alarm:github': BROWSER_TEST_NOW + 120_000,
        'alarm:previews': BROWSER_TEST_NOW + 180_000,
        'alarm:lifecycle': BROWSER_TEST_NOW + 240_000,
        'alarm:lifecycle:run': BROWSER_TEST_NOW + 60_000,
        'security:regular-alarms-deferred-until': BROWSER_TEST_NOW + 2_000,
      },
    })
    await controls.request('hold')
    const opening = controls.open()
    await controls.request('entered')
    const { WORKSPACES } = await runtime.getBindings<{
      WORKSPACES: DurableObjectNamespace<Workspace>
    }>()
    const suspension = WORKSPACES.getByName(
      WORKSPACE_ID,
    ).suspendMemberLifecycle({ orgId: 'org', generation: 1 }, WORKSPACE_ID)
    const initial = await controls.request('suspension-entered')
    expect(initial.fence).toEqual({
      orgId: 'org',
      generation: 1,
      mode: 'suspended',
    })
    expect(initial.browserAt).toBe(BROWSER_TEST_NOW + 15_000)
    expect(initial.alarm).toBe(BROWSER_TEST_NOW + 15_000)
    expect(initial.regular).toEqual([null, null, null])
    expect(initial.pending).toBe(BROWSER_TEST_NOW + 60_000)
    expect(initial.deferred).toBe(BROWSER_TEST_NOW + 2_000)
    await controls.request('release')
    const late = await opening
    sockets.push(late.socket)
    expect(await suspension).toEqual({ ok: true })
    const admitted = await controls.request('settled')
    expect(admitted.closed).toBe(1)
    expect(admitted.opened).toBe(2)
    expect(late.socket.readyState).toBe(1)
    expect(array(admitted.registrations, record)).toMatchObject([
      {
        deadline: BROWSER_TEST_NOW + 30_000,
        checkAt: BROWSER_TEST_NOW + 15_000,
      },
    ])
    expect(state(admitted.state).get('alarm:browser')).toBe(
      BROWSER_TEST_NOW + 15_000,
    )
    expect(admitted.alarm).toBe(BROWSER_TEST_NOW + 15_000)
    expect(state(admitted.state).has('alarm:lifecycle:run')).toBe(false)
    expect(
      state(admitted.state).has('security:regular-alarms-deferred-until'),
    ).toBe(false)
    const db = await runtime.getD1Database('DB')
    await db.prepare("DELETE FROM sessions WHERE id = 'session'").run()
    await controls.request('clock', { now: BROWSER_TEST_NOW + 14_999 })
    expect(await controls.request('arm-due')).toEqual({
      scheduled: BROWSER_TEST_NOW + 15_000,
      armed: false,
    })
    expect(late.socket.readyState).toBe(1)
    await controls.request('clock', { now: BROWSER_TEST_NOW + 15_000 })
    expect(await controls.request('arm-due')).toEqual({
      scheduled: BROWSER_TEST_NOW + 15_000,
      armed: true,
    })
    await controls.request('observed', { count: 1 })
    await controls.request('settled')
    const expired = await controls.request('inspect')
    expect(expired.closed).toBe(2)
    expect(expired.opened).toBe(2)
    expect(expired.reads).toBe(number(admitted.reads) + 1)
    expect(expired.registrations).toEqual([])
    expect(expired.alarm).toBeNull()
    expect(state(expired.state).has('alarm:browser')).toBe(false)
    expect(state(expired.state).get('members:lifecycle-fence')).toEqual(
      initial.fence,
    )
    expect(state(expired.state).has('alarm:lifecycle:run')).toBe(false)
    expect(
      state(expired.state).has('security:regular-alarms-deferred-until'),
    ).toBe(false)
    expect(late.inbox.received).toEqual([late.history])
    expect(current.inbox.received).toEqual([current.history])
  } finally {
    await controls.request('release')
    await disposeBrowsers(runtime, sockets)
  }
})
