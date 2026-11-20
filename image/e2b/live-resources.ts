import { rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  ProviderAllocationAbsent,
  ProviderError,
} from '../../worker/sandbox/errors'
import type { SandboxProvider } from '../../worker/sandbox/provider'
import { CheckError, until } from '../live-input'
import { probeRepository, ready } from './live-command'
import type { E2bLiveConfiguration } from './live-input'

interface Allocation {
  kind: 'sandbox'
  key: string
  id: string | null
}
interface Snapshot {
  kind: 'snapshot'
  name: string
}
type Resource = Allocation | Snapshot
type CleanupProvider = Pick<
  SandboxProvider,
  'create' | 'delete' | 'deleteSnapshot'
>

async function deleteKnown(operation: () => Promise<void>): Promise<void> {
  try {
    await operation()
  } catch (error) {
    if (!(error instanceof ProviderError && error.kind === 'not_found'))
      throw error
  }
}

export class LiveResources {
  readonly entries: Resource[] = []
  private readonly config: E2bLiveConfiguration
  constructor(config: E2bLiveConfiguration) {
    this.config = config
  }

  private async persist() {
    const temporary = join(this.config.output, 'resources.new')
    await writeFile(temporary, `${JSON.stringify(this.entries, null, 2)}\n`, {
      mode: 0o600,
    })
    await rename(temporary, join(this.config.output, 'resources.json'))
  }

  async create(
    provider: SandboxProvider,
    phase: string,
    snapshotName?: string,
  ): Promise<string> {
    const entry: Allocation = {
      kind: 'sandbox',
      key: `${this.config.runId}-${phase}`,
      id: null,
    }
    this.entries.push(entry)
    await this.persist()
    const sandbox = await provider.create({
      idempotencyKey: entry.key,
      snapshotName,
      ttlSeconds: 1800,
      labels: { purpose: 'e2b-live-image', live_run: this.config.runId },
      env: {
        CONDUCTIVE_REPOSITORY_DIR: probeRepository,
        CONDUCTIVE_LIVE_PROBE: phase,
      },
    })
    entry.id = sandbox.id
    await this.persist()
    await ready(provider, sandbox.id)
    return sandbox.id
  }

  async snapshot(
    provider: SandboxProvider,
    id: string,
    phase: string,
  ): Promise<string> {
    const name = `${this.config.runId}-${phase}`
    this.entries.push({ kind: 'snapshot', name })
    await this.persist()
    const saved = await provider.saveSnapshot(id, name)
    if (saved.status === 'failed')
      throw new CheckError('An E2B image snapshot failed.')
    if (saved.status !== 'ready')
      await until(async () => {
        const snapshot = await provider.getSnapshot(name)
        if (snapshot.status === 'failed')
          throw new CheckError('An E2B image snapshot failed.')
        return snapshot.status === 'ready' ? true : null
      }, 'the E2B filesystem snapshot')
    return name
  }

  async cleanup(provider: CleanupProvider): Promise<Resource[]> {
    const pending: Resource[] = []
    for (const resource of [...this.entries].reverse()) {
      try {
        if (resource.kind === 'snapshot')
          await deleteKnown(() => provider.deleteSnapshot(resource.name))
        else {
          if (!resource.id) {
            try {
              const sandbox = await provider.create({
                idempotencyKey: resource.key,
                ttlSeconds: 1800,
              })
              resource.id = sandbox.id
              await this.persist()
            } catch (error) {
              if (error instanceof ProviderAllocationAbsent) continue
              throw error
            }
          }
          const id = resource.id
          await deleteKnown(() => provider.delete(id))
        }
      } catch {
        pending.push(resource)
      }
    }
    return pending
  }
}
