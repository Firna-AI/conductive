import type { AppEnv } from '../env'
import { workspaceTarget } from '../previews/access'
import { WorkspaceTools } from '../previews/provider'
import type { ToolDependencies } from '../previews/types'
import { ProviderError } from '../sandbox/errors'
import type { SandboxProvider } from '../sandbox/provider'
import { cacheTerminalPassword } from './credentials'
import { privilegedCommand, shellArgument } from './privileged'
import { terminalSupportProbe } from './support'
import { readTerminalFiles } from './service-files'
import {
  TERMINAL_RUNTIME,
  TERMINAL_RUNTIME_VIEW,
  TERMINAL_RESTORE_MARKER,
  TERMINAL_SUPPORT_FILE,
} from './scripts'

export function terminalPackagesCommand(): string {
  return privilegedCommand(`set -eu
apt-get -o Acquire::AllowReleaseInfoChange::Label=true update
apt-get install -y ttyd tmux
# The ttyd package enables its own service on port 7681, which the
# workspace terminal needs. Stop it and keep it from starting.
systemctl disable --now ttyd.service 2>/dev/null || true
systemctl mask ttyd.service`)
}

/** The lifecycle launches this command detached after the startup script exits. */
export function terminalStartCommand(): string {
  return privilegedCommand(`set -eu
install -d -m 700 -o user -g user ${shellArgument(TERMINAL_RUNTIME)}
touch ${shellArgument(`${TERMINAL_RUNTIME}/enabled`)}
systemctl stop ttyd.service 2>/dev/null || true
rm -f -- ${shellArgument(`${TERMINAL_RUNTIME}/${TERMINAL_SUPPORT_FILE}`)}
systemctl start conductive-terminal.service
systemctl is-active --quiet conductive-terminal.service
${terminalSupportProbe()}
install -d -m 700 -o user -g user ${shellArgument(TERMINAL_RUNTIME_VIEW)}
mountpoint -q ${shellArgument(TERMINAL_RUNTIME_VIEW)} || mount --bind ${shellArgument(TERMINAL_RUNTIME)} ${shellArgument(TERMINAL_RUNTIME_VIEW)}`)
}

export async function markTerminalRestoreEnded(
  provider: Pick<SandboxProvider, 'runCommand'>,
  sandboxId: string,
): Promise<void> {
  const result = await provider.runCommand(
    sandboxId,
    privilegedCommand(`touch ${shellArgument(TERMINAL_RESTORE_MARKER)}`),
  )
  if (result.exitCode !== 0 || result.timedOut)
    throw new ProviderError('unavailable', 502)
}

/** Read and cache the password only after the detached setup command succeeds. */
export async function startWorkspaceTerminal(
  env: AppEnv,
  orgId: string,
  workspaceId: string,
  dependencies: ToolDependencies,
): Promise<void> {
  const target = await workspaceTarget(env, orgId, workspaceId)
  const provider = await WorkspaceTools.forWorkspace(
    env,
    target,
    dependencies.fetch,
  )
  const { password, several } = await readTerminalFiles(provider)
  await cacheTerminalPassword(
    env,
    target,
    password,
    dependencies.now(),
    several ?? false,
  )
}
