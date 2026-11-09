import { expect, it } from 'vitest'

import { setupBackendTests } from './backend-test-hooks'
import { SOFTWARE } from './backend-test-support'
import { workspaceTaskAlarms } from './workspace-task-alarms'

const fixtureForTest = setupBackendTests()

it.each(['workspace', 'image'] as const)(
  'clears a completed access alarm without lifecycle state in the %s role',
  async (role) => {
    const fixture = fixtureForTest()
    const now = fixture.runtime.dependencies.now()
    const id = `${role}-without-lifecycle`
    fixture.runtime.workspace(id)
    const actor = fixture.actors.get(id)
    if (!actor) throw new Error('The workspace controller is missing.')
    const alarms = workspaceTaskAlarms(actor.storage)
    if (role === 'image') {
      await actor.storage.put('image', 'org-image:coordinator', {
        orgId: fixture.org.id,
        software: SOFTWARE,
        buildId: null,
        nextAt: now + 60_000,
      })
      await alarms.set('lifecycle:image', now + 60_000)
    }
    await alarms.set('lifecycle:access', now)
    await actor.storage.deleteAlarm()
    await actor.endpoint().alarm()
    expect(await alarms.take(now)).toEqual(new Set())
    expect(actor.storage.alarmAt).toBe(role === 'image' ? now + 60_000 : null)
  },
)
