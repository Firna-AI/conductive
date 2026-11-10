import { ChatTransaction } from '../chat/store'
import type { ChatData } from '../chat/types'
import { CHAT_META } from '../chat/storage-keys'

export interface NativeCommitView {
  storage: ChatData
  writes: readonly string[]
  read<T>(
    workspaceId: string,
    work: (view: ChatTransaction) => Promise<T>,
  ): Promise<T>
}

export function nativeCommitView(
  storage: ChatData,
  writes: readonly string[],
  now: () => number,
): NativeCommitView {
  return {
    storage,
    writes,
    read: async (workspaceId, work) => {
      const metadata = await storage.get<{
        workspaceId: string
        through: number
        commandThrough: number
      }>(CHAT_META)
      return work(
        new ChatTransaction(
          storage,
          metadata ?? { workspaceId, through: 0, commandThrough: 0 },
          now(),
        ),
      )
    },
  }
}
