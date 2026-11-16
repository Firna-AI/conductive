import type { AppEnv } from '../env'
import { HttpError, privateResponse } from '../http'
import { requireRunning, verifyTarget } from '../previews/access'
import type { ToolDependencies } from '../previews/types'
import type { WorkspaceAccessTarget } from '../previews/workspace-store'
import { providerForAccount } from '../sandbox/client'
import { ProviderError } from '../sandbox/errors'
import { closeWorkspaceTerminal } from './close'
import { terminalSeveral } from './credentials'
import type { TerminalRoute } from './request'
import type { WorkspaceTerminals } from './workspace'

export async function mutateTerminal(
  env: AppEnv,
  dependencies: ToolDependencies,
  terminals: WorkspaceTerminals | undefined,
  target: WorkspaceAccessTarget,
  userId: string,
  route: Extract<TerminalRoute, { kind: 'create' | 'close' }>,
): Promise<Response> {
  requireRunning(target)
  const authorize = () => verifyTarget(env, target, userId)
  await authorize()
  if (!terminals) throw new ProviderError('unavailable', 503)
  if (route.kind === 'create') {
    if (
      !(await terminalSeveral(
        env,
        target.workspaceId,
        target.sandboxId,
        target.providerAccount,
      ))
    )
      throw new HttpError(
        409,
        'terminals_unavailable',
        'This workspace needs a software update to open more terminals. Try again after its next start.',
      )
    const result = await terminals.create(
      target.orgId,
      target.workspaceId,
      authorize,
    )
    return privateResponse(Response.json(result, { status: 201 }))
  }
  const sandboxId = target.sandboxId
  if (!sandboxId) throw new ProviderError('unavailable', 503)
  const result = await terminals.close(
    target.orgId,
    target.workspaceId,
    route.terminalId,
    authorize,
    () =>
      closeWorkspaceTerminal(
        providerForAccount(env, dependencies.fetch, target.providerAccount),
        sandboxId,
        route.terminalId,
      ),
  )
  return privateResponse(Response.json(result))
}
