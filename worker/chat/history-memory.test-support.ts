import { HistoryPages } from './history-pages'
import { legacyHistory } from './history-session-index.test-support'
import { SESSION_INDEX_THROUGH } from './history-session-keys'
import { saveHistoryEvent } from './history-storage'
import { CHAT_META, chatEventKey } from './storage-keys'
import type { ChatMetadata } from './store-metadata'
import type { ChatData } from './types'
import type { WorkspaceEvent } from './workspace-events'

export function historyMemory() {
  const records = new Map<string, unknown>()
  const storage: ChatData = {
    async get<T>(key: string) {
      return records.get(key) as T | undefined
    },
    async put(key, value) {
      records.set(key, value)
    },
    async delete(key) {
      return records.delete(key)
    },
    async list<T>({
      prefix,
      startAfter,
      end,
      reverse,
      limit,
    }: Parameters<ChatData['list']>[0]) {
      const keys = [...records.keys()]
        .filter(
          (key) =>
            key.startsWith(prefix) &&
            (startAfter === undefined || key > startAfter) &&
            (end === undefined || key < end),
        )
        .sort()
      if (reverse) keys.reverse()
      return new Map(
        keys.slice(0, limit).map((key) => [key, records.get(key) as T]),
      )
    },
  }
  return { records, storage }
}

async function putHistoryBatches(
  storage: Pick<DurableObjectStorage, 'put'>,
  entries: readonly [string, unknown][],
) {
  const batchSize = 128
  for (let offset = 0; offset < entries.length; offset += batchSize)
    await storage.put(
      Object.fromEntries(entries.slice(offset, offset + batchSize)),
    )
}

/** Writes legacy event records to native storage without one RPC per record. */
export async function seedLegacyHistory(
  storage: DurableObjectStorage,
  events: readonly WorkspaceEvent[],
  compactionCurrent = true,
) {
  const entries: [string, unknown][] = []
  await legacyHistory(
    {
      get: (key) => storage.get(key),
      put: async (key, value) => {
        entries.push([key, value])
      },
      delete: (key) => storage.delete(key),
      list: (options) => storage.list(options),
    },
    events,
    compactionCurrent,
  )
  await putHistoryBatches(storage, entries)
}

/** Seeds a long committed history without a separate RPC for each storage write. */
export async function seedHistory(
  storage: Pick<DurableObjectStorage, 'get' | 'put'>,
  workspaceId: string,
  occurredAt: number,
  events: readonly WorkspaceEvent[],
) {
  const metadata = (await storage.get<ChatMetadata>(CHAT_META)) ?? {
    workspaceId,
    through: 0,
    commandThrough: 0,
  }
  const memory = historyMemory()
  const pages = new HistoryPages(memory.storage)
  const indexedThrough = await storage.get<number>(SESSION_INDEX_THROUGH)
  if (indexedThrough !== undefined)
    await memory.storage.put(SESSION_INDEX_THROUGH, indexedThrough)
  let through = metadata.through
  for (const event of events) {
    const envelope = { workspaceId, eventNumber: ++through, occurredAt, event }
    await saveHistoryEvent(memory.storage, chatEventKey(through), envelope)
    await pages.index(envelope)
  }
  await memory.storage.put(CHAT_META, { ...metadata, through })
  await putHistoryBatches(storage, [...memory.records])
  return { after: metadata.through, through }
}
