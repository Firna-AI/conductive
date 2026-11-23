import { expect, it } from 'vitest'

import { RunnerConnectionStore } from './runner-connection-store'
import type { RunnerConnectionState } from './runner-connection-state'
import type { ChatData, ChatStorage } from './types'

function memory(): ChatStorage & { values: Map<string, unknown> } {
  const values = new Map<string, unknown>()
  const data: ChatData = {
    get: <T>(key: string) => Promise.resolve(values.get(key) as T | undefined),
    put: (key, value) => {
      values.set(key, structuredClone(value))
      return Promise.resolve()
    },
    delete: (key) => Promise.resolve(values.delete(key)),
    list: () => Promise.resolve(new Map()),
  }
  return { ...data, values, transaction: (work) => work(data) }
}

const connection: Omit<RunnerConnectionState, 'generation'> = {
  id: 'connection',
  workspace: {
    id: 'workspace',
    orgId: 'org',
    tokenHash: 'hash',
    archivedAt: null,
  },
  streamId: 'stream',
  processStartId: null,
  protocolVersion: 2,
  ready: true,
  checkAt: 100,
}

it('keeps the repository folder of a runner that can move, and reads older records without it', async () => {
  const storage = memory()
  const store = new RunnerConnectionStore(storage)
  const saved = await store.replace({
    ...connection,
    repositoryFolder: '/home/user/code/billing',
  })
  expect(await store.current()).toEqual(saved)
  expect(saved.repositoryFolder).toBe('/home/user/code/billing')
  await store.save({ ...saved, repositoryFolder: undefined }, saved.generation)
  expect(await store.current()).not.toHaveProperty('repositoryFolder')
  const older = await store.replace(connection)
  expect(await store.current()).toEqual(older)
})

it('refuses a saved repository folder that is not text', async () => {
  const storage = memory()
  const store = new RunnerConnectionStore(storage)
  await store.replace(connection)
  const text = String(storage.values.get('native:runner:state:0'))
  const state = JSON.parse(text) as { connection: Record<string, unknown> }
  state.connection.repositoryFolder = 7
  storage.values.set('native:runner:state:0', JSON.stringify(state))
  await expect(store.current()).rejects.toThrow(
    'The saved runner connection is invalid.',
  )
})

it('keeps the capability notice announcement across a wake and defaults older records to no support', async () => {
  const storage = memory()
  const store = new RunnerConnectionStore(storage)
  const capable = await store.replace({
    ...connection,
    capabilityNotices: true,
  })
  expect(await store.current()).toMatchObject({ capabilityNotices: true })
  await store.save({ ...capable, capabilityNotices: false }, capable.generation)
  expect(await store.current()).not.toHaveProperty('capabilityNotices')
  await store.replace(connection)
  expect(await store.current()).not.toHaveProperty('capabilityNotices')
})

it('keeps pending and refused repository moves and reads records without a move', async () => {
  const storage = memory()
  const store = new RunnerConnectionStore(storage)
  const repositoryMove = {
    commandId: 'move-billing',
    folder: '/home/user/code/billing',
    refused: false,
  }
  const saved = await store.replace({ ...connection, repositoryMove })
  expect(await store.current()).toEqual({ ...saved, repositoryMove })
  const refused = {
    ...saved,
    repositoryMove: { ...repositoryMove, refused: true },
  }
  await store.save(refused, saved.generation)
  expect(await store.current()).toEqual(refused)
  const older = await store.replace(connection)
  expect(await store.current()).toEqual(older)
  const malformed = { ...older, repositoryMove: { commandId: 7 } }
  storage.values.set(
    'native:runner:state:0',
    JSON.stringify({ generation: older.generation, connection: malformed }),
  )
  expect(await store.current()).toEqual(older)
})
