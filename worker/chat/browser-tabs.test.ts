import { expect, it } from 'vitest'

import type {
  WorkspaceEventEnvelope,
  WorkspaceSocketMessage,
} from '../../src/shared/events'
import { BrowserTabs } from './browser-tabs'

it('sends events only before the grant deadline when scheduled callbacks do not run', async () => {
  let now = 0
  let closed = 0
  const messages: WorkspaceSocketMessage[] = []
  const scheduledCallbacks: (() => Promise<void>)[] = []
  const tabs = new BrowserTabs({
    now: () => now,
    readConnectionAccess: async () => [
      { connectionNumber: 0, deadline: 30_000 },
    ],
    scheduleBrowserCheck: (work) => {
      scheduledCallbacks.push(work)
      return () => undefined
    },
  })
  await tabs.add(
    {
      send: (message) => messages.push(message),
      close: () => {
        closed++
      },
    },
    {
      kind: 'workspace',
      sessionId: 'session',
      userId: 'user',
      orgId: 'org',
      workspaceId: 'workspace',
    },
  )
  const beforeDeadline: WorkspaceEventEnvelope = {
    workspaceId: 'workspace',
    eventNumber: 1,
    occurredAt: 29_999,
    event: { type: 'workspace.title', name: 'Before the deadline' },
  }
  const afterDeadline: WorkspaceEventEnvelope = {
    workspaceId: 'workspace',
    eventNumber: 2,
    occurredAt: 30_001,
    event: { type: 'workspace.title', name: 'After the deadline' },
  }

  now = 29_999
  tabs.publish([beforeDeadline])
  expect(messages).toEqual([{ type: 'event', envelope: beforeDeadline }])
  expect(closed).toBe(0)

  now = 30_001
  tabs.publish([afterDeadline])
  expect(messages).toEqual([{ type: 'event', envelope: beforeDeadline }])
  expect(closed).toBe(1)
})
