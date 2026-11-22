import type { ServiceCatalogue } from '../../src/shared/generated/ServiceCatalogue'
import type { ServiceReport } from '../../src/shared/generated/ServiceReport'
import type { ServiceRow } from '../../src/shared/generated/ServiceRow'
import type { ServiceTarget } from '../../src/shared/generated/ServiceTarget'
import { serviceRecord } from '../../src/shared/service-inputs'
import type { ActiveRunner } from '../chat/types'
import type { ChatStore } from '../chat/store'
import type { WorkspaceTarget } from '../previews/types'
import {
  readBinding,
  sameBinding,
  serviceBinding,
  type ServiceBinding,
  type ServiceConnection,
} from './binding'
import { readServiceReport } from './report-input'
import { ServiceValues, SERVICE_ROOT } from './storage'

const KEY = `${SERVICE_ROOT}catalogue`
interface SavedReport {
  binding: ServiceBinding
  report: ServiceReport
}

export class ServiceReports {
  private readonly values: ServiceValues
  private readonly connections: ServiceConnection
  private readonly store: ChatStore

  constructor(
    values: ServiceValues,
    connections: ServiceConnection,
    store: ChatStore,
  ) {
    this.values = values
    this.connections = connections
    this.store = store
  }

  private async read(): Promise<SavedReport | null> {
    const value = await this.values.read(KEY)
    if (value === undefined) return null
    const input = serviceRecord(value)
    return {
      binding: readBinding(input.binding),
      report: readServiceReport(input.report),
    }
  }

  async accept(
    active: ActiveRunner,
    binding: ServiceBinding,
    report: ServiceReport,
  ): Promise<void> {
    const old = await this.read()
    if (
      old &&
      old.report.bootId === report.bootId &&
      old.report.revision >= report.revision
    )
      return
    if (!(await this.connections.valid(active, binding))) return
    await this.values.write(KEY, { binding, report })
  }

  async current(
    active: ActiveRunner,
    target: WorkspaceTarget,
  ): Promise<ServiceReport | null> {
    const stored = await this.read()
    if (!stored || !sameBinding(stored.binding, serviceBinding(active, target)))
      return null
    if (!(await this.connections.valid(active, stored.binding))) return null
    return stored.report
  }

  async matches(
    active: ActiveRunner,
    target: WorkspaceTarget,
    observed: ServiceTarget,
  ): Promise<boolean> {
    const report = await this.current(active, target)
    return (
      report !== null &&
      report.bootId === observed.bootId &&
      report.services.some(
        (entry) =>
          entry.serviceId === observed.serviceId &&
          entry.generation === observed.generation,
      )
    )
  }

  async catalogue(target: WorkspaceTarget): Promise<ServiceCatalogue> {
    if (
      !target.sandboxId ||
      target.state === 'stopped' ||
      target.state === 'archived'
    )
      return { state: 'stopped' }
    const active = this.connections.current()
    if (
      !active ||
      active.state.services !== true ||
      active.state.workspace.id !== target.workspaceId
    )
      return { state: 'unsupported' }
    const report = await this.current(active, target)
    if (!report) return { state: 'unsupported' }
    const services = await this.store.read(target.workspaceId, async (view) => {
      const rows: ServiceRow[] = []
      for (const entry of report.services) {
        const { originatingTurnId, ...summary } = entry
        const turn =
          originatingTurnId === undefined
            ? undefined
            : await view.turn(originatingTurnId)
        const session = turn ? await view.session(turn.sessionId) : undefined
        rows.push({
          ...summary,
          source: session
            ? {
                kind: 'session',
                sessionId: session.id,
                title: session.title,
                agent: session.choice.agent,
              }
            : { kind: 'local_command' },
        })
      }
      return rows.sort((left, right) =>
        left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
      )
    })
    if (!(await this.connections.valid(active, serviceBinding(active, target))))
      return { state: 'unsupported' }
    return {
      state: 'ready',
      snapshot: { bootId: report.bootId, revision: report.revision, services },
    }
  }

  clear(): Promise<void> {
    return this.values.delete(KEY)
  }
}
