import { expect, it } from 'vitest'

import { nativeChatStore } from './native-store.test-support'
import { RunnerConnectionStore } from './runner-connection-store'

it.each([true, undefined] as const)(
  'restores the saved runner file server announcement %s, including legacy records',
  async (fileServer) => {
    const native = await nativeChatStore()
    const store = new RunnerConnectionStore(native.storage)
    const connection = {
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
      ...(fileServer === true ? { fileServer: true } : {}),
      ready: true,
      checkAt: 1000,
    }
    const saved = await store.replace(connection)
    const restored = await new RunnerConnectionStore(native.storage).current()
    expect(restored).toEqual({ ...connection, generation: 1 })
    await store.save({ ...saved, ready: false }, saved.generation)
    expect(await store.current()).toEqual({
      ...connection,
      generation: 1,
      ready: false,
    })
  },
)
