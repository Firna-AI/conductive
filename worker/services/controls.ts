import type { ServiceControlRequest } from '../../src/shared/generated/ServiceControlRequest'
import type { ServiceControlResult } from '../../src/shared/generated/ServiceControlResult'
import type { ServiceControlOutcome } from '../../src/shared/generated/ServiceControlOutcome'
import {
  readServiceControlRequest,
  ServiceInputError,
  serviceRecord,
} from '../../src/shared/service-inputs'
import { checkRunnerEnvelopeBytes } from '../chat/runner-event-limits'
import type { ActiveRunner } from '../chat/types'
import type { WorkspaceTarget } from '../previews/types'
import { hash } from '../security/crypto'
import {
  readBinding,
  sameBinding,
  serviceBinding,
  type ServiceBinding,
  type ServiceConnection,
} from './binding'
import type { ServiceReports } from './catalogue'
import { readControlOutcome } from './result-input'
import { ServiceValues, SERVICE_ROOT } from './storage'

const PREFIX = `${SERVICE_ROOT}control:`
interface ControlRecord {
  binding: ServiceBinding | null
  request: ServiceControlRequest
  outcome: ServiceControlOutcome | null
}
interface Waiter {
  result: Promise<ServiceControlResult>
  resolve(result: ServiceControlResult): void
}

function sameRequest(
  left: ServiceControlRequest,
  right: ServiceControlRequest,
): boolean {
  return (
    left.requestId === right.requestId &&
    left.action === right.action &&
    left.target.bootId === right.target.bootId &&
    left.target.serviceId === right.target.serviceId &&
    left.target.generation === right.target.generation
  )
}

export class ServiceControls {
  private readonly waiters = new Map<string, Waiter>()
  private readonly values: ServiceValues
  private readonly connections: ServiceConnection
  private readonly reports: ServiceReports

  constructor(
    values: ServiceValues,
    connections: ServiceConnection,
    reports: ServiceReports,
  ) {
    this.values = values
    this.connections = connections
    this.reports = reports
  }

  private async read(key: string): Promise<ControlRecord | null> {
    const stored = await this.values.read(key)
    if (stored === undefined) return null
    const input = serviceRecord(stored)
    return {
      binding: input.binding === null ? null : readBinding(input.binding),
      request: readServiceControlRequest(input.request),
      outcome:
        input.outcome === null ? null : readControlOutcome(input.outcome),
    }
  }

  private waiter(key: string): Waiter {
    const existing = this.waiters.get(key)
    if (existing) return existing
    let resolve: Waiter['resolve'] = () => undefined
    const result = new Promise<ServiceControlResult>((done) => {
      resolve = done
    })
    const waiter = { result, resolve }
    this.waiters.set(key, waiter)
    return waiter
  }

  private async finish(
    key: string,
    record: ControlRecord,
    outcome: ServiceControlOutcome,
  ): Promise<ServiceControlResult> {
    const result = { request: record.request, outcome }
    await this.values.write(key, { ...record, outcome })
    this.waiters.get(key)?.resolve(result)
    this.waiters.delete(key)
    return result
  }

  /** Register and send inside the chat queue. Await result outside that queue. */
  async begin(
    target: WorkspaceTarget,
    request: ServiceControlRequest,
    authorize: () => Promise<void>,
  ): Promise<{ result: Promise<ServiceControlResult> }> {
    const key = `${PREFIX}${await hash(request.requestId)}`
    const old = await this.read(key)
    if (old) {
      if (old.outcome)
        return {
          result: Promise.resolve({
            request: old.request,
            outcome: old.outcome,
          }),
        }
      const active = this.connections.current()
      if (
        !active ||
        !old.binding ||
        !(await this.connections.valid(active, old.binding))
      )
        return {
          result: Promise.resolve(
            await this.finish(key, old, { state: 'unconfirmed' }),
          ),
        }
      await authorize()
      return { result: this.waiter(key).result }
    }
    const command = { type: 'services.control' as const, request }
    checkRunnerEnvelopeBytes(command)
    const active = this.connections.current()
    const binding =
      active && target.sandboxId ? serviceBinding(active, target) : null
    const record: ControlRecord = { binding, request, outcome: null }
    if (!active || !binding || !(await this.connections.valid(active, binding)))
      return {
        result: Promise.resolve(
          await this.finish(key, record, { state: 'unconfirmed' }),
        ),
      }
    if (!(await this.reports.matches(active, target, request.target)))
      return {
        result: Promise.resolve(
          await this.finish(key, record, { state: 'stale' }),
        ),
      }
    await authorize()
    if (!(await this.connections.valid(active, binding)))
      return {
        result: Promise.resolve(
          await this.finish(key, record, { state: 'unconfirmed' }),
        ),
      }
    await this.values.write(key, record)
    const waiter = this.waiter(key)
    try {
      await authorize()
      if (!(await this.connections.valid(active, binding)))
        throw new Error('Service connection ended.')
      await active.peer.send(command)
    } catch {
      await this.finish(key, record, { state: 'unconfirmed' })
    }
    return { result: waiter.result }
  }

  async accept(
    active: ActiveRunner,
    binding: ServiceBinding,
    requestId: string,
    result: ServiceControlResult,
  ): Promise<void> {
    if (requestId !== result.request.requestId)
      throw new ServiceInputError('Mismatched service control request.')
    const key = `${PREFIX}${await hash(requestId)}`
    const record = await this.read(key)
    if (
      !record ||
      record.outcome ||
      !record.binding ||
      !sameBinding(record.binding, binding) ||
      !sameRequest(record.request, result.request)
    )
      return
    if (!(await this.connections.valid(active, binding))) return
    await this.finish(key, record, result.outcome)
  }

  async end(
    workspaceId: string,
    state: 'unconfirmed' | 'computer_stopped',
    connectionId?: string,
  ): Promise<void> {
    for (const key of await this.values.keys(PREFIX)) {
      const record = await this.read(key)
      if (
        !record ||
        record.outcome ||
        record.binding?.workspaceId !== workspaceId ||
        (connectionId !== undefined &&
          record.binding.connectionId !== connectionId)
      )
        continue
      await this.finish(key, record, { state })
    }
  }

  async connected(active: ActiveRunner): Promise<void> {
    for (const key of await this.values.keys(PREFIX)) {
      const record = await this.read(key)
      if (
        record?.outcome === null &&
        record.binding?.workspaceId === active.state.workspace.id &&
        (record.binding.connectionId !== active.state.id ||
          record.binding.generation !== active.state.generation)
      )
        await this.finish(key, record, { state: 'unconfirmed' })
    }
  }

  async discard(active: ActiveRunner, requestId: string): Promise<void> {
    const key = `${PREFIX}${await hash(requestId)}`
    const record = await this.read(key)
    if (
      record?.outcome === null &&
      record.binding &&
      record.binding.connectionId === active.state.id &&
      record.binding.generation === active.state.generation &&
      (await this.connections.valid(active, record.binding))
    )
      await this.finish(key, record, { state: 'unconfirmed' })
  }

  async clear(workspaceId: string): Promise<void> {
    await this.end(workspaceId, 'computer_stopped')
    for (const key of await this.values.keys(PREFIX)) {
      const record = await this.read(key)
      if (
        record &&
        (!record.binding || record.binding.workspaceId === workspaceId)
      )
        await this.values.delete(key)
    }
  }
}
