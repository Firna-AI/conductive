import { saveHistoryEvent } from './history-storage'
import { CHAT_EVENT_PREFIX, CHAT_META, chatEventKey } from './storage-keys'
import { readChatMetadata } from './store-metadata'
import type { ChatData, ChatStorage } from './types'
import type { WorkspaceEvent } from './workspace-events'

export async function previousWorkerWrite(
  data: ChatData,
  event?: WorkspaceEvent,
  occurredAt = 25,
) {
  const { workspaceId, through, commandThrough } = await readChatMetadata(
    data,
    'workspace',
  )
  const eventNumber = event ? through + 1 : through
  if (event)
    await saveHistoryEvent(data, chatEventKey(eventNumber), {
      workspaceId,
      eventNumber,
      occurredAt,
      event,
    })
  await data.put(CHAT_META, {
    workspaceId,
    through: eventNumber,
    commandThrough,
  })
}

export function trackRecoveryPages(
  storage: ChatStorage,
  afterPage?: () => Promise<void>,
) {
  const lists: Parameters<ChatData['list']>[0][] = []
  const reads: string[] = []
  const observe = (data: ChatData, onList: () => void): ChatData => ({
    get(key) {
      reads.push(key)
      return data.get(key)
    },
    put: (key, value) => data.put(key, value),
    delete: (key) => data.delete(key),
    list(options) {
      if (options.prefix === CHAT_EVENT_PREFIX) {
        lists.push(options)
        onList()
      }
      return data.list(options)
    },
  })
  const tracked: ChatStorage = {
    ...observe(storage, () => undefined),
    async transaction(work) {
      let page = false
      const result = await storage.transaction((data) =>
        work(
          observe(data, () => {
            page = true
          }),
        ),
      )
      if (page) await afterPage?.()
      return result
    },
  }
  return { storage: tracked, lists, reads }
}
