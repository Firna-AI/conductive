import type { AppEnv, HttpFetch } from '../env'
import { HttpError } from '../http'
import { providerForAccount } from '../sandbox/client'
import type { PortMode, SandboxProvider } from '../sandbox/provider'
import { verifyTarget } from './access'
import type { WorkspaceTarget } from './types'

/** The feature authorizes every operation. The core provider owns routes and credentials. */
export class WorkspaceTools {
  private readonly env: AppEnv
  private readonly target: WorkspaceTarget
  private readonly provider: SandboxProvider
  private readonly userId?: string

  private constructor(
    env: AppEnv,
    target: WorkspaceTarget,
    provider: SandboxProvider,
    userId?: string,
  ) {
    this.env = env
    this.target = target
    this.provider = provider
    this.userId = userId
  }

  static async forWorkspace(
    env: AppEnv,
    target: WorkspaceTarget,
    fetch: HttpFetch,
    userId?: string,
  ) {
    await verifyTarget(env, target, userId, false)
    return new WorkspaceTools(
      env,
      target,
      providerForAccount(env, fetch, target.providerAccount),
      userId,
    )
  }

  async privatePort(port: number, mode: PortMode) {
    const id = await this.authorize()
    return this.provider.privatePort(id, port, mode)
  }

  async desktop(): Promise<string> {
    const result = await this.provider.desktop(await this.authorize())
    if (result.kind === 'starting')
      throw new HttpError(
        409,
        'desktop_starting',
        'The desktop is starting. Try again.',
      )
    return result.url
  }

  async command(command: string) {
    return this.provider.runCommand(await this.authorize(false), command)
  }

  async readFile(path: string, maxBytes: number) {
    return this.provider.readFile(await this.authorize(false), path, maxBytes)
  }

  private async authorize(running = true): Promise<string> {
    await verifyTarget(this.env, this.target, this.userId, running)
    const id = this.target.sandboxId
    if (!id)
      throw new HttpError(
        404,
        'workspace_not_found',
        'The workspace is not available.',
      )
    return id
  }
}
