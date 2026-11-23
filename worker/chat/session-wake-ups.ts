import type { AgentScheduleWakeUpRequest } from '../../src/shared/generated/AgentScheduleWakeUpRequest'
import type { AgentScheduleWakeUpResponse } from '../../src/shared/generated/AgentScheduleWakeUpResponse'
import type { AgentListWakeUpsResponse } from '../../src/shared/generated/AgentListWakeUpsResponse'
import type { AgentCancelWakeUpResponse } from '../../src/shared/generated/AgentCancelWakeUpResponse'
import { sessionLink } from '../../src/shared/session-link'
import { utcWakeUpTime } from '../../src/shared/wake-up-time'
import { activeStoredTurn } from '../devices/access'
import { HttpError } from '../http'
import type { LifecycleEnvironment } from '../lifecycle/runtime'
import {
  LIFECYCLE_FENCE_KEY,
  type ReceiverFence,
} from '../members/receiver-fence'
import { hash } from '../security/crypto'
import type { ToolSessionAccess } from '../tools/services'
import { warnWorker } from '../warnings'
import { invalidInput } from './inputs'
import type { ChatOperation } from './operation'
import { cancelWakeUp } from './session-wake-up-cancel'
import { deliverWakeUp, wakeUpOrgActive } from './session-wake-up-delivery'
import {
  SessionWakeUpRecords,
  type WakeUpResume,
} from './session-wake-up-records'
import { sessionFor } from './session-record'
import { admitWake } from './wake-admission'
import { resumeWakeDelivery } from './wake-resume'
import type { createWorkspaceIntegration } from './workspace-integration'

const RETRY_MS = 30_000
type WakeIntegration = Pick<
  ReturnType<typeof createWorkspaceIntegration>,
  'chat' | 'controller' | 'alarms' | 'storage' | 'now' | 'withGeneration'
>

interface ToolWakeTarget {
  orgId: string
  workspaceId: string
  sessionId: string
}

export interface ToolWakeCancel extends ToolWakeTarget {
  wakeUpId: string
  callerWorkspaceId: string
  callerSessionId: string
  senderUserId: string
}

export class SessionWakeUps {
  private readonly env: LifecycleEnvironment
  private readonly integration: WakeIntegration
  private readonly records: SessionWakeUpRecords

  constructor(env: LifecycleEnvironment, integration: WakeIntegration) {
    this.env = env
    this.integration = integration
    this.records = new SessionWakeUpRecords(integration.storage)
  }

  schedule(
    orgId: string,
    workspaceId: string,
    turnId: string,
    input: AgentScheduleWakeUpRequest,
    authorize: (senderId: string) => Promise<ToolSessionAccess>,
  ): Promise<AgentScheduleWakeUpResponse> {
    const { chat, alarms, now } = this.integration
    return chat.runLifecycle(async () => {
      const turn = await activeStoredTurn(chat, workspaceId, turnId)
      if (!turn)
        throw new HttpError(
          403,
          'calling_turn_required',
          'Start this request from an active agent turn.',
        )
      const { workspace } = await authorize(turn.senderId)
      const operation = chat.operation(workspaceId)
      const session = this.link({
        orgId,
        workspaceId,
        sessionId: turn.sessionId,
      })
      const repeat = await hash(JSON.stringify([turn.id, input]))
      const existing = await operation.read((view) =>
        view.wakeUps.repeated(repeat),
      )
      if (existing) return { workspace, session, wakeUp: existing.wakeUp }
      const receivedAt = now()
      const at =
        'at' in input
          ? input.at
          : receivedAt + Math.round(input.delaySeconds * 1_000)
      if (!Number.isSafeInteger(at)) return invalidInput()
      const wakeUp = {
        id: crypto.randomUUID(),
        at,
        atUtc: utcWakeUpTime(at),
        text: input.text,
      }
      await this.records.assertActive()
      await alarms.set('session-wake-ups', Math.max(receivedAt, at), true)
      await operation.change(async (view) => {
        await view.wakeUps.assertActive()
        await view.wakeUps.save({
          stage: 'pending',
          orgId,
          sessionId: session.id,
          senderUserId: turn.senderId,
          repeat,
          wakeUp,
        })
        await view.emit({
          type: 'session.wake-up-scheduled',
          sessionId: session.id,
          wakeUp,
        })
      })
      return { workspace, session, wakeUp }
    })
  }

  list(
    input: ToolWakeTarget,
    workspace: AgentListWakeUpsResponse['workspace'],
  ): Promise<AgentListWakeUpsResponse> {
    return this.integration.chat.readWorkspace(
      input.workspaceId,
      async (view) => {
        await sessionFor(view, input.sessionId)
        return {
          workspace,
          session: this.link(input),
          wakeUps: await view.wakeUps.pending(input.sessionId),
        }
      },
    )
  }

  cancel(
    input: ToolWakeCancel,
    authorize: () => Promise<ToolSessionAccess>,
  ): Promise<AgentCancelWakeUpResponse> {
    const { chat } = this.integration
    return chat.runLifecycle(async () => {
      const { workspace } = await authorize()
      const operation = chat.operation(input.workspaceId)
      const { wakeUpId, state } = await cancelWakeUp(
        operation,
        input.sessionId,
        input.wakeUpId,
        {
          kind: 'session',
          workspaceId: input.callerWorkspaceId,
          sessionId: input.callerSessionId,
        },
      )
      return { workspace, session: this.link(input), wakeUpId, state }
    })
  }

  async alarm(): Promise<void> {
    const { chat, storage, now, alarms, withGeneration } = this.integration
    const workspaceId = await chat.store.workspaceId()
    if (!workspaceId) return
    await chat.runLifecycle((turn) =>
      withGeneration(turn, async () => {
        const fence = await storage.get<ReceiverFence>(LIFECYCLE_FENCE_KEY)
        if (fence && fence.mode !== 'active') return
        const generation = fence?.generation ?? 0
        const operation = chat.operation(workspaceId)
        const due = await this.records.due(now())
        if (due.length || (await this.records.hasResume()))
          await alarms.set('session-wake-ups', now() + RETRY_MS)
        let postponed = false
        for (const { id } of due) {
          const record = await this.records.record(id)
          if (record?.stage !== 'pending') continue
          try {
            if (!(await deliverWakeUp(operation, record, this.env, generation)))
              postponed = true
          } catch {
            postponed = true
            warnWorker({ kind: 'workspace_alarm_failed' })
          }
        }
        for (const receipt of await this.records.resumes()) {
          try {
            if (!(await this.resume(operation, receipt, generation)))
              postponed = true
          } catch {
            postponed = true
            warnWorker({ kind: 'workspace_alarm_failed' })
          }
        }
        const next = await this.records.next()
        const retryAt = now() + (postponed ? RETRY_MS : 0)
        const retry = await this.records.hasResume()
        const pending =
          next === null ? Infinity : next <= now() ? retryAt : next
        const at = Math.min(pending, retry ? retryAt : Infinity)
        await alarms.set('session-wake-ups', at === Infinity ? null : at)
      }),
    )
  }

  repairAlarm(): Promise<void> {
    const { chat, alarms, now } = this.integration
    return chat.runLifecycle(async () => {
      if (await alarms.has('session-wake-ups')) return
      await this.records.assertActive()
      const next = await this.records.next()
      if (await this.records.hasResume())
        await alarms.set('session-wake-ups', now())
      else if (next !== null)
        await alarms.set('session-wake-ups', Math.max(now(), next))
    })
  }

  private async resume(
    operation: ChatOperation,
    receipt: WakeUpResume,
    generation: number,
  ): Promise<boolean> {
    if (!(await wakeUpOrgActive(this.env.DB, receipt.orgId))) return false
    const { chat, controller, now } = this.integration
    await resumeWakeDelivery(
      chat,
      operation,
      receipt,
      async (senderId) =>
        (await admitWake(operation, receipt, this.env, senderId)).kind ===
        'admitted',
      this.env,
      controller,
      now,
    )
    await operation.change(async (view) => {
      await view.wakeUps.assertActive(generation)
      await view.wakeUps.finishResume(receipt.id)
    })
    return true
  }

  private link({ orgId, workspaceId, sessionId }: ToolWakeTarget) {
    return {
      id: sessionId,
      link: sessionLink(this.env.APP_ORIGIN, orgId, workspaceId, sessionId),
    }
  }
}
