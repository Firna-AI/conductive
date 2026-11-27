import { expect, it } from 'vitest'

import { nativeChatStore } from './native-store.test-support'
import { RunnerConnectionStore } from './runner-connection-store'
import type { RunnerConnectionState } from './runner-connection-state'

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

it('keeps repository move capabilities across a wake and accepts older records', async () => {
  const { storage } = await nativeChatStore()
  const store = new RunnerConnectionStore(storage)
  const saved = await store.replace({
    ...connection,
    repositoryFolder: '/home/user/code/billing',
    addsRepositoryFolder: true,
  })
  expect(await store.current()).toEqual(saved)
  expect(saved.repositoryFolder).toBe('/home/user/code/billing')
  await store.save({ ...saved, addsRepositoryFolder: false }, saved.generation)
  expect(await store.current()).toEqual({
    ...connection,
    generation: saved.generation,
    repositoryFolder: '/home/user/code/billing',
  })
  await store.save(
    { ...saved, repositoryFolder: undefined, addsRepositoryFolder: undefined },
    saved.generation,
  )
  expect(await store.current()).not.toHaveProperty('repositoryFolder')
  const older = await store.replace(connection)
  expect(await store.current()).toEqual(older)
})

it('refuses a saved repository folder that is not text', async () => {
  const { storage } = await nativeChatStore()
  const store = new RunnerConnectionStore(storage)
  const saved = await store.replace(connection)
  await storage.put(
    'native:runner:state:0',
    JSON.stringify({
      generation: saved.generation,
      connection: { ...saved, repositoryFolder: 7 },
    }),
  )
  await expect(store.current()).rejects.toThrow(
    'The saved runner connection is invalid.',
  )
})

it('keeps the capability notice announcement across a wake and defaults older records to no support', async () => {
  const { storage } = await nativeChatStore()
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
  const { storage } = await nativeChatStore()
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
  await storage.put(
    'native:runner:state:0',
    JSON.stringify({ generation: older.generation, connection: malformed }),
  )
  expect(await store.current()).toEqual(older)
})
