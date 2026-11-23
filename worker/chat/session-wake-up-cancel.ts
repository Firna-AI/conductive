import type { SessionCancelWakeUpResponse } from '../../src/shared/generated/SessionCancelWakeUpResponse'
import type { WakeUpCancelSource } from '../../src/shared/generated/WakeUpCancelSource'
import { HttpError } from '../http'
import type { ChatOperation } from './operation'
import { sessionFor } from './session-record'

export function cancelWakeUp(
  operation: ChatOperation,
  sessionId: string,
  wakeUpId: string,
  source: WakeUpCancelSource,
  generation?: number,
): Promise<SessionCancelWakeUpResponse> {
  return operation.change(async (view) => {
    await view.wakeUps.assertActive(generation)
    await sessionFor(view, sessionId)
    const record = await view.wakeUps.record(wakeUpId)
    if (!record || record.sessionId !== sessionId)
      throw new HttpError(
        404,
        'wake_up_not_found',
        'The wake-up is not available.',
      )
    if (record.stage !== 'pending')
      return {
        eventNumber: view.eventNumber,
        wakeUpId,
        state: record.stage === 'fired' ? 'already-fired' : 'already-ended',
      }
    await view.wakeUps.settle(record, 'ended')
    await view.emit({
      type: 'session.wake-up-ended',
      sessionId,
      wakeUpId,
      at: record.wakeUp.at,
      outcome: { kind: 'cancelled', source },
    })
    return { eventNumber: view.eventNumber, wakeUpId, state: 'cancelled' }
  })
}
