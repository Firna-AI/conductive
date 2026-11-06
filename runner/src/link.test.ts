import { expect, it } from 'vitest'

import type {
  RunnerEventEnvelope,
  WorkspaceToRunner,
} from '../../src/shared/runner'
import type { RunnerConnector } from '../../src/shared/runner-transport'
import { FakeDurableObjectEndpoint } from '../../worker/test-support/fake-durable-object'
import { RunnerLink } from './link'
import { EventStore, type RunnerState } from './state'

it('retains numbered events across gaps, wrong confirms, reconnect, and restart', async () => {
  let saved: RunnerState | null = null
  const storage = {
    read: async () => saved,
    write: async (value: RunnerState) => {
      saved = structuredClone(value)
    },
  }
  const endpoint = new FakeDurableObjectEndpoint({
    workspaceId: 'workspace-1',
    workspaceToken: 'fake-token',
  })
  endpoint.confirmEvents = false
  let discard = true
  let inject: (message: WorkspaceToRunner) => void = () => {}
  const attempted: RunnerEventEnvelope[] = []
  const connector: RunnerConnector = async (request) => {
    const connection = await endpoint.connect(request)
    return {
      ...connection,
      send: (message) => {
        if (message.type === 'event') {
          attempted.push(structuredClone(message))
          if (discard) {
            discard = false
            return
          }
        }
        connection.send(message)
      },
      onMessage: (listener) => {
        inject = listener
        return connection.onMessage(listener)
      },
      onClose: (listener) => connection.onClose(listener),
      close: () => connection.close(),
    }
  }
  const options = {
    workspaceId: 'workspace-1',
    request: { url: endpoint.url, workspaceToken: 'fake-token' },
    connect: connector,
    now: () => 100,
    command: () => {},
    connected: async () => {},
    disconnected: () => {},
    warn: () => {},
  }
  const store = await EventStore.open(storage)
  const link = new RunnerLink(store, options)
  await link.connect()
  await link.emit({ type: 'workspace.title', name: 'First' })
  await link.emit({ type: 'workspace.title', name: 'Second' })
  await link.idle()
  expect(endpoint.runnerEvents.map((event) => event.eventNumber)).toEqual([
    1, 2,
  ])
  expect(attempted.map((event) => event.eventNumber)).toEqual([1, 2, 1, 2])
  expect(attempted[0]).toEqual(attempted[2])
  inject({ type: 'confirm', streamId: 'another-stream', throughEventNumber: 2 })
  await link.idle()
  expect(store.snapshot.outbox.map((event) => event.eventNumber)).toEqual([
    1, 2,
  ])
  inject({
    type: 'confirm',
    streamId: store.snapshot.streamId,
    throughEventNumber: 1,
  })
  await link.idle()
  expect(store.snapshot.outbox.map((event) => event.eventNumber)).toEqual([2])
  endpoint.disconnect()
  await link.emit({ type: 'workspace.title', name: 'Offline' })
  const offline = store.snapshot.outbox.at(-1)
  const restored = new RunnerLink(await EventStore.open(storage), options)
  await restored.connect()
  expect(endpoint.runnerEvents).toHaveLength(3)
  expect(endpoint.runnerEvents[2]).toEqual(offline)
  expect(restored.store.snapshot.streamId).toBe(store.snapshot.streamId)
  expect(restored.store.snapshot.nextEventNumber).toBe(4)
  endpoint.confirmEvents = true
  inject({
    type: 'resend',
    streamId: store.snapshot.streamId,
    fromEventNumber: 3,
  })
  await restored.idle()
  expect(restored.store.snapshot.outbox).toEqual([])
  expect(endpoint.events.map((event) => event.eventNumber)).toEqual([1, 2, 3])
  restored.close()
})
