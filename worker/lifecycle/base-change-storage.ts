import type { ChatStorage } from '../chat/types'
import { QUEUE_FIX_REPORT_ALARM } from '../chat/queue-fix-records'
import { scheduleWorkspaceAlarm } from '../features/alarms'
import type { ReceiverStorage } from '../members/receiver-storage'

/** Register the native alarm before chat commits a job's due time. */
export function workspaceJobChatStorage(storage: ReceiverStorage): ChatStorage {
  return {
    ...storage,
    transaction: (work) =>
      storage.transaction(async (transaction) => {
        const result = await work(transaction)
        if (
          (await transaction.get('alarm:baseChange')) !== undefined ||
          (await transaction.get(QUEUE_FIX_REPORT_ALARM)) !== undefined
        )
          await scheduleWorkspaceAlarm(transaction)
        return result
      }),
  }
}
