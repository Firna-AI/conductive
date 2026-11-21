import type { ServiceControlRequest } from '../../src/shared/generated/ServiceControlRequest'
import type { ServiceLogRequest } from '../../src/shared/generated/ServiceLogRequest'
import {
  ServiceInputError,
  serviceRecord,
} from '../../src/shared/service-inputs'
import { HttpError } from '../http'
import { checkRunnerEnvelopeBytes } from '../chat/runner-event-limits'
import type { ActiveRunner, ChatStorage } from '../chat/types'
import type { ChatStore } from '../chat/store'
import type { AppEnv } from '../env'
import type { WorkspaceTarget } from '../previews/types'
import { warnWorker } from '../warnings'
import { ServiceConnection, serviceBinding } from './binding'
import { ServiceReports } from './catalogue'
import { ServiceControls } from './controls'
import { filteredOutcome, filteredReport, serviceTextFilter } from './filter'
import { ServiceLogs } from './logs'
import { isServiceMessage, readServiceMessage, ServiceParts } from './parts'
import { readServiceReport } from './report-input'
import { readControlResult, readRawLogResponse } from './result-input'
import { ServiceValues } from './storage'
import { negotiateServices } from './negotiation'

export class WorkspaceServices {
  private readonly connections: ServiceConnection
  private readonly reports: ServiceReports
  private readonly controls: ServiceControls
  private readonly logs: ServiceLogs
  private readonly parts = new Map<string, ServiceParts>()

  private readonly env: AppEnv
  private readonly store: ChatStore
  private readonly randomId: () => string

  constructor(
    storage: ChatStorage,
    env: AppEnv,
    store: ChatStore,
    current: () => ActiveRunner | null,
    randomId: () => string,
  ) {
    this.env = env
    this.store = store
    this.randomId = randomId

    const values = new ServiceValues(storage)
    this.connections = new ServiceConnection(env, current)
    this.reports = new ServiceReports(values, this.connections, store)
    this.controls = new ServiceControls(values, this.connections, this.reports)
    this.logs = new ServiceLogs(
      env,
      store,
      this.connections,
      this.reports,
      randomId,
    )
  }

  async negotiate(active: ActiveRunner, offered: boolean): Promise<void> {
    await negotiateServices(active, offered, this.env, this.connections)
  }

  async welcomed(active: ActiveRunner): Promise<void> {
    await this.controls.connected(active)
    if (active.state.services !== true) return
    const target = await this.connections.target(active)
    if (!target) return
    const command = {
      type: 'services.report' as const,
      requestId: this.randomId(),
    }
    checkRunnerEnvelopeBytes(command)
    if (!(await this.connections.valid(active, serviceBinding(active, target))))
      return
    await active.peer.send(command)
  }

  /** Private traffic precedes the numbered reader and never enters its watch. */
  async receive(active: ActiveRunner, value: unknown): Promise<boolean> {
    if (active.state.services !== true || !isServiceMessage(value)) return false
    const parts = this.parts.get(active.state.id) ?? new ServiceParts()
    this.parts.set(active.state.id, parts)
    try {
      const message = readServiceMessage(value)
      if (
        message.type === 'services.logs.part' &&
        !this.logs.expects(active, message.requestId)
      )
        return true
      const target = await this.connections.target(active)
      if (!target) return true
      const binding = serviceBinding(active, target)
      const document = parts.accept(message)
      if (document === undefined) return true
      if (message.type === 'services.logs.part') {
        await this.logs.accept(
          active,
          binding,
          message.requestId,
          readRawLogResponse(document),
        )
        return true
      }
      const filter = await serviceTextFilter(
        this.env,
        this.store,
        active.state.workspace,
      )
      if (!(await this.connections.valid(active, binding))) return true
      if (message.type === 'services.report.part')
        await this.reports.accept(
          active,
          binding,
          filteredReport(readServiceReport(document), filter),
        )
      else {
        const result = readControlResult(document)
        await this.controls.accept(active, binding, message.requestId, {
          ...result,
          outcome: filteredOutcome(result.outcome, filter),
        })
      }
    } catch (error) {
      if (
        !(error instanceof ServiceInputError) &&
        !(error instanceof SyntaxError) &&
        !(error instanceof HttpError && error.status === 400)
      )
        throw error
      parts.discard(value)
      const input = serviceRecord(value)
      if (typeof input.requestId === 'string') {
        if (input.type === 'services.control.result.part')
          await this.controls.discard(active, input.requestId)
        if (input.type === 'services.logs.part')
          this.logs.discard(active, input.requestId)
      }
      warnWorker({ kind: 'runner_service_message_invalid' })
    }
    return true
  }

  catalogue(target: WorkspaceTarget) {
    return this.store.run(() => this.reports.catalogue(target))
  }

  async control(
    target: WorkspaceTarget,
    request: ServiceControlRequest,
    authorize: () => Promise<void>,
  ) {
    const registered = await this.store.run(() =>
      this.controls.begin(target, request, authorize),
    )
    return registered.result
  }

  readLogs(
    target: WorkspaceTarget,
    request: ServiceLogRequest,
    authorize: () => Promise<void>,
  ) {
    return this.logs.read(target, request, authorize)
  }

  async disconnected(connectionId: string): Promise<void> {
    this.parts.delete(connectionId)
    const workspaceId = await this.store.workspaceId()
    if (!workspaceId) return
    this.logs.end(workspaceId, connectionId)
    await this.controls.end(workspaceId, 'unconfirmed', connectionId)
  }

  readonly stoppedHook = async (
    workspaceId: string,
    restartFailed?: boolean,
  ): Promise<void> => {
    if (!restartFailed) await this.stopped(workspaceId)
  }

  async stopped(workspaceId: string): Promise<void> {
    const active = this.connections.current()
    if (active?.state.workspace.id === workspaceId)
      this.parts.delete(active.state.id)
    this.logs.end(workspaceId)
    await this.reports.clear()
    await this.controls.clear(workspaceId)
  }
}
