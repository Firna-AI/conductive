import { expect, it, onTestFinished } from 'vitest'

import type {
  RunnerEventEnvelope,
  WorkspaceToRunner,
} from '../../src/shared/runner'
import type { RunnerConnector } from '../../src/shared/runner-transport'
import { FakeDurableObjectEndpoint } from '../../worker/test-support/fake-durable-object'
import { diskFixture } from '../test-support/disk'
import { RunnerLink } from './link'
import { EventStore } from './state'

it('retains numbered events across gaps, wrong confirms, reconnect, and restart', async () => {
  const { storage } = await diskFixture()
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

it('replays only saved events while another append write is held', async () => {
  const { storage, holdNextWrite } = await diskFixture()
  const store = await EventStore.open(storage)
  const endpoint = new FakeDurableObjectEndpoint({
    workspaceId: 'workspace-1',
    workspaceToken: 'fake-token',
  })
  endpoint.confirmEvents = false
  let drop = true
  let resend: WorkspaceToRunner | null = null
  let deliver: (message: WorkspaceToRunner) => void = () => {}
  const connect: RunnerConnector = async (request) => {
    const connection = await endpoint.connect(request)
    return {
      send: (message) => {
        if (message.type === 'event' && drop) {
          drop = false
          return
        }
        connection.send(message)
      },
      onMessage: (listener) => {
        deliver = listener
        return connection.onMessage((message) => {
          if (message.type === 'resend') resend = message
          else listener(message)
        })
      },
      onClose: (listener) => connection.onClose(listener),
      close: () => connection.close(),
    }
  }
  const link = new RunnerLink(store, {
    workspaceId: 'workspace-1',
    request: { url: endpoint.url, workspaceToken: 'fake-token' },
    connect,
    now: () => 100,
    command: () => {},
    connected: async () => {},
    disconnected: () => {},
    warn: () => {},
  })
  await link.connect()
  await link.emit({
    type: 'files.snapshot',
    tree: { revision: 1, partNumber: 1, partCount: 1, entries: [] },
  })
  await link.emit({ type: 'workspace.title', name: 'two' })
  const { arrived: writing, release } = holdNextWrite(
    (value) => value.nextEventNumber === 4,
  )
  const third = link.emit({
    type: 'changes.updated',
    changes: {
      revision: 1,
      partNumber: 1,
      partCount: 1,
      baseBranch: 'main',
      files: [],
      summary: { files: 0, added: 0, removed: 0 },
    },
  })
  onTestFinished(async () => {
    release()
    await third
    link.close()
  })
  await writing
  expect(resend).toMatchObject({ type: 'resend', fromEventNumber: 1 })
  if (resend === null)
    throw new Error('The fake endpoint did not request a resend.')
  deliver(resend)
  await link.idle()
  expect(endpoint.runnerEvents.map((event) => event.eventNumber)).toEqual([
    1, 2,
  ])
  expect(store.snapshot.nextEventNumber).toBe(3)
  expect(store.snapshot.fileRevisions).toEqual({ tree: 1, changes: 0 })
  expect(store.snapshot.outbox.map((event) => event.eventNumber)).toEqual([
    1, 2,
  ])
  release()
  await third
  await link.idle()
  expect(endpoint.runnerEvents.map((event) => event.eventNumber)).toEqual([
    1, 2, 3,
  ])
  expect(store.snapshot.nextEventNumber).toBe(4)
  expect(store.snapshot.fileRevisions).toEqual({ tree: 1, changes: 1 })
  const saved = await storage.read()
  expect(await store.snapshot).toEqual(saved)
})
