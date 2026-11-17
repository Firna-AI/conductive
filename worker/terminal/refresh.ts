import type { AppEnv } from '../env'
import { verifyTarget } from '../previews/access'
import { WorkspaceTools } from '../previews/provider'
import type { ToolDependencies, WorkspaceTarget } from '../previews/types'
import { ProviderError } from '../sandbox/errors'
import { cacheTerminalPassword, terminalSeveral } from './credentials'
import { readTerminalFiles } from './service-files'
import type { WorkspaceTerminals } from './workspace'

/** Read outside the queue, then serialize the cache comparison with list events. */
export async function refreshWorkspaceTerminal(
  env: AppEnv,
  target: WorkspaceTarget,
  dependencies: ToolDependencies,
  terminals: WorkspaceTerminals,
): Promise<void> {
  const provider = await WorkspaceTools.forWorkspace(
    env,
    target,
    dependencies.fetch,
  )
  const { password, several } = await readTerminalFiles(provider)
  if (several === undefined) throw new ProviderError('invalid_response', 502)
  await terminals.refreshSupport(
    target.orgId,
    target.workspaceId,
    several,
    async () => {
      await verifyTarget(env, target, undefined, false)
      const previous = await terminalSeveral(
        env,
        target.workspaceId,
        target.sandboxId,
        target.providerAccount,
      )
      await cacheTerminalPassword(
        env,
        target,
        password,
        dependencies.now(),
        several,
      )
      return previous !== several
    },
  )
}
