import { ServiceInputError } from '../../src/shared/service-inputs'
import type { ServiceLogRequest } from '../../src/shared/generated/ServiceLogRequest'
import type { ServiceLogResponse } from '../../src/shared/generated/ServiceLogResponse'
import type { ServiceRawLogResponse } from '../../src/shared/generated/ServiceRawLogResponse'
import { checkRunnerEnvelopeBytes } from '../chat/runner-event-limits'
import type { ActiveRunner } from '../chat/types'
import type { ChatStore } from '../chat/store'
import type { WorkspaceTarget } from '../previews/types'
import type { AppEnv } from '../env'
import {
  sameBinding,
  serviceBinding,
  type ServiceBinding,
  type ServiceConnection,
} from './binding'
import type { ServiceReports } from './catalogue'
import { filteredLog, serviceTextFilter } from './filter'

interface LogRead {
  binding: ServiceBinding
  appRequest: ServiceLogRequest
  runnerRequest: ServiceLogRequest
  resolve(response: ServiceLogResponse): void
}

export class ServiceLogs {
  private serial: Promise<void> = Promise.resolve()
  private pending: LogRead | null = null
  private readonly env: AppEnv
  private readonly store: ChatStore
  private readonly connections: ServiceConnection
  private readonly reports: ServiceReports
  private readonly randomId: () => string

  constructor(
    env: AppEnv,
    store: ChatStore,
    connections: ServiceConnection,
    reports: ServiceReports,
    randomId: () => string,
  ) {
    this.env = env
    this.store = store
    this.connections = connections
    this.reports = reports
    this.randomId = randomId
  }

  /** Only one raw log assembly lives in this workspace at a time. */
  read(
    target: WorkspaceTarget,
    request: ServiceLogRequest,
    authorize: () => Promise<void>,
  ): Promise<ServiceLogResponse> {
    const read = this.serial.then(async () => {
      const registered = await this.store.run(() =>
        this.begin(target, request, authorize),
      )
      return registered.result
    })
    this.serial = read.then(
      () => undefined,
      () => undefined,
    )
    return read
  }

  private async begin(
    target: WorkspaceTarget,
    request: ServiceLogRequest,
    authorize: () => Promise<void>,
  ): Promise<{ result: Promise<ServiceLogResponse> }> {
    await authorize()
    const active = this.connections.current()
    const unavailable = {
      result: Promise.resolve<ServiceLogResponse>({
        request,
        result: { state: 'unavailable' },
      }),
    }
    if (!active || !target.sandboxId) return unavailable
    const binding = serviceBinding(active, target)
    if (!(await this.connections.valid(active, binding))) return unavailable
    if (!(await this.reports.matches(active, target, request.target)))
      return {
        result: Promise.resolve({ request, result: { state: 'stale' } }),
      }
    const runnerRequest = { ...request, requestId: this.randomId() }
    const command = { type: 'services.logs' as const, request: runnerRequest }
    checkRunnerEnvelopeBytes(command)
    let resolve: LogRead['resolve'] = () => undefined
    const result = new Promise<ServiceLogResponse>((done) => {
      resolve = done
    })
    this.pending = { binding, appRequest: request, runnerRequest, resolve }
    try {
      await authorize()
      if (!(await this.connections.valid(active, binding)))
        throw new Error('Service connection ended.')
      await active.peer.send(command)
    } catch {
      this.end(target.workspaceId)
    }
    return { result }
  }

  expects(active: ActiveRunner, requestId: string): boolean {
    return (
      this.pending?.runnerRequest.requestId === requestId &&
      this.pending.binding.connectionId === active.state.id &&
      this.pending.binding.generation === active.state.generation
    )
  }

  async accept(
    active: ActiveRunner,
    binding: ServiceBinding,
    requestId: string,
    response: ServiceRawLogResponse,
  ): Promise<void> {
    const read = this.pending
    if (
      !read ||
      !this.expects(active, requestId) ||
      !sameBinding(read.binding, binding)
    )
      return
    const expected = read.runnerRequest
    if (
      response.request.requestId !== expected.requestId ||
      response.request.target.bootId !== expected.target.bootId ||
      response.request.target.serviceId !== expected.target.serviceId ||
      response.request.target.generation !== expected.target.generation
    )
      throw new ServiceInputError('Mismatched service log request.')
    const filter = await serviceTextFilter(
      this.env,
      this.store,
      active.state.workspace,
    )
    const result = filteredLog(response.result, filter)
    if (
      !(await this.connections.valid(active, binding)) ||
      this.pending !== read
    )
      return
    this.pending = null
    read.resolve({ request: read.appRequest, result })
  }

  end(workspaceId: string, connectionId?: string): void {
    const read = this.pending
    if (
      !read ||
      read.binding.workspaceId !== workspaceId ||
      (connectionId !== undefined && read.binding.connectionId !== connectionId)
    )
      return
    this.pending = null
    read.resolve({ request: read.appRequest, result: { state: 'unavailable' } })
  }

  discard(active: ActiveRunner, requestId: string): void {
    const read = this.pending
    if (!read || !this.expects(active, requestId)) return
    this.pending = null
    read.resolve({
      request: read.appRequest,
      result: {
        state: 'failed',
        error: {
          code: 'service_log_invalid',
          message: 'The service log could not load. Try again.',
        },
      },
    })
  }
}
