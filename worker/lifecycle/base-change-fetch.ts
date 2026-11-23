import type { SandboxProvider } from '../sandbox/provider'
import { baseChangeFetchCommand } from './base-change-commands'

interface OwnerFetch {
  ownerUserId: string
  authorize(): Promise<boolean>
}

/** The owner credential exists only during the isolated fetch. */
export class WorkspaceBaseFetches {
  private readonly active = new Map<string, OwnerFetch>()

  async fetch(
    provider: Pick<SandboxProvider, 'runCommand'>,
    sandboxId: string,
    input: Parameters<typeof baseChangeFetchCommand>[0],
    owner: OwnerFetch,
  ): Promise<boolean> {
    if (!(await owner.authorize())) return false
    this.active.set(input.fetchId, owner)
    try {
      const result = await provider.runCommand(
        sandboxId,
        baseChangeFetchCommand(input),
      )
      return result.exitCode === 0 && !result.timedOut
    } finally {
      this.active.delete(input.fetchId)
    }
  }

  async credentialSender(fetchId: string): Promise<string | null | undefined> {
    if (!fetchId.startsWith('baseChange-')) return undefined
    const fetch = this.active.get(fetchId)
    return fetch &&
      (await fetch.authorize()) &&
      this.active.get(fetchId) === fetch
      ? fetch.ownerUserId
      : null
  }
}
