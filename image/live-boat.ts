import { randomUUID } from 'node:crypto'

import {
  CheckError,
  object,
  text,
  until,
  type LiveConfiguration,
} from './live-input'

export class LiveBoat {
  private readonly config: LiveConfiguration

  constructor(config: LiveConfiguration) {
    this.config = config
  }

  async request(method: string, path: string, body?: Record<string, unknown>) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.boatKey}`,
      'X-Boat-Org': this.config.boatOrg,
      Accept: 'application/json',
    }
    if (body) headers['Content-Type'] = 'application/json'
    if (path.endsWith('/fork')) headers['Idempotency-Key'] = randomUUID()
    if (method === 'DELETE')
      headers['X-Ascii-Confirm-Delete'] = path.split('/').at(-1) ?? ''
    const response = await fetch(`${this.config.boatApi}${path}`, {
      method,
      headers,
      redirect: 'error',
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(
        path.endsWith('/commands') ? 610_000 : 30_000,
      ),
    })
    if (!response.ok)
      throw new CheckError(
        `The cloud computer ${method} request failed with HTTP ${response.status}.`,
      )
    const result = object(await response.json())
    if (result.ok !== true)
      throw new CheckError('The cloud computer request did not succeed.')
    return result
  }

  async findWorkspace(workspaceId: string): Promise<string> {
    return until(async () => {
      const query = new URLSearchParams({ limit: '200' })
      query.append('label', `workspace=${workspaceId}`)
      query.append('label', `org=${this.config.orgId}`)
      const result = await this.request('GET', `/sandboxes?${query}`)
      if (!Array.isArray(result.sandboxes) || result.sandboxes.length > 1)
        throw new CheckError(
          'The workspace labels must identify exactly one cloud computer.',
        )
      if (!result.sandboxes.length) return null
      const sandbox = object(result.sandboxes[0])
      const labels = object(sandbox.labels)
      if (labels.workspace !== workspaceId || labels.org !== this.config.orgId)
        throw new CheckError(
          'The cloud computer labels do not match the created workspace.',
        )
      return text(sandbox.id)
    }, 'the created cloud computer')
  }

  async ready(id: string, stopped = false): Promise<void> {
    await until(
      async () => {
        const sandbox = object(
          (await this.request('GET', `/sandboxes/${encodeURIComponent(id)}`))
            .sandbox,
        )
        const state = text(sandbox.state)
        if (state === 'error' || state === 'cancelled')
          throw new CheckError('The cloud computer entered an error state.')
        return (
          stopped
            ? state === 'archived'
            : ['ready', 'idle', 'running'].includes(state)
        )
          ? true
          : null
      },
      stopped ? 'the sandbox stop' : 'the sandbox resume',
    )
  }

  async stop(id: string): Promise<void> {
    await this.request('POST', `/sandboxes/${encodeURIComponent(id)}/stop`, {})
    await this.ready(id, true)
  }

  async resume(id: string, env: Record<string, string>): Promise<void> {
    await this.request('POST', `/sandboxes/${encodeURIComponent(id)}/resume`, {
      noEnv: true,
      env,
      ttlSeconds: 1_800,
    })
    await this.ready(id)
  }

  async fork(id: string, placement: string): Promise<string> {
    const result = await this.request(
      'POST',
      `/sandboxes/${encodeURIComponent(id)}/fork`,
      {
        name: `runner-measure-${placement}-${randomUUID().slice(0, 8)}`,
        type: 'default',
        noEnv: true,
        env: {},
        ttlSeconds: 1_800,
        labels: { purpose: 'runner-first-start-measurement' },
      },
    )
    return text(object(result.sandbox).id)
  }

  async command(id: string, command: string): Promise<string> {
    const result = await this.request(
      'POST',
      `/sandboxes/${encodeURIComponent(id)}/commands`,
      {
        command,
        timeoutSeconds: 600,
      },
    )
    if (
      result.exitCode !== 0 ||
      result.timedOut !== false ||
      typeof result.stdout !== 'string'
    )
      throw new CheckError(
        'The sandbox command failed. Its output was suppressed to protect credentials.',
      )
    return result.stdout
  }

  async remove(id: string): Promise<void> {
    await this.request('DELETE', `/sandboxes/${encodeURIComponent(id)}`)
  }
}
