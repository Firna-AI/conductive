import { wakeUpText } from '../../docs/mockups/src/components/chat/wakeUpCopy'
import type { AppEnv } from '../env'
import type { ChatOperation } from './operation'
import type { PendingWakeUp } from './session-wake-up-records'
import { admitWake } from './wake-admission'
import { saveWakeMessage } from './wake-message'

/** Deleted and suspended orgs keep their work until their access returns. */
export async function wakeUpOrgActive(db: D1Database, orgId: string) {
  return (
    (await db
      .prepare(
        'SELECT id FROM orgs WHERE id = ? AND deleted_at IS NULL AND suspended_at IS NULL',
      )
      .bind(orgId)
      .first()) !== null
  )
}

export async function deliverWakeUp(
  operation: ChatOperation,
  record: PendingWakeUp,
  env: AppEnv,
  generation: number,
): Promise<boolean> {
  const { sessionId, orgId, senderUserId, wakeUp } = record
  if (!(await wakeUpOrgActive(env.DB, orgId))) return false
  const admission = await admitWake(operation, record, env)
  if (!(await wakeUpOrgActive(env.DB, orgId))) return false
  await operation.change(async (view) => {
    await view.wakeUps.assertActive(generation)
    if (admission.kind !== 'admitted') {
      await view.wakeUps.settle(record, 'ended')
      await view.emit({
        type: 'session.wake-up-ended',
        sessionId,
        at: wakeUp.at,
        wakeUpId: wakeUp.id,
        outcome: { kind: 'could-not-start', reason: admission },
      })
      return
    }
    const { session, user } = admission
    const messageId = `session-wake-up:${wakeUp.id}`
    const turnId = await saveWakeMessage(
      view,
      session,
      user,
      { id: messageId, text: wakeUpText(wakeUp.text) },
      () => crypto.randomUUID(),
    )
    await view.emit({
      type: 'session.wake-up-fired',
      sessionId,
      wakeUpId: wakeUp.id,
      messageId,
      turnId,
      text: wakeUp.text,
    })
    await view.saveSession(session)
    await view.emit({ type: 'session.updated', session })
    await view.wakeUps.settle(record, 'fired')
    await view.wakeUps.saveResume({
      id: wakeUp.id,
      orgId,
      sessionId,
      senderUserId,
      messageId,
    })
  })
  return true
}
