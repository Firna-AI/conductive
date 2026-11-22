import type { ChatStorage } from '../chat/types'
import { scheduleWorkspaceAlarm } from '../features/alarms'
import type { ReceiverStorage } from '../members/receiver-storage'

/** Register the native alarm before the move's chat transaction commits. */
export function baseChangeChatStorage(storage: ReceiverStorage): ChatStorage {
  return {
    ...storage,
    transaction: (work) =>
      storage.transaction(async (transaction) => {
        const result = await work(transaction)
        if ((await transaction.get('alarm:baseChange')) !== undefined)
          await scheduleWorkspaceAlarm(transaction)
        return result
      }),
  }
}
