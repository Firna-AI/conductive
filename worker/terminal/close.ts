import { isAdditionalTerminalId } from '../../src/shared/terminal'
import { ProviderError } from '../sandbox/errors'
import type { SandboxProvider } from '../sandbox/provider'
import { privilegedCommand, shellArgument } from './privileged'
import { TERMINAL_RUNTIME } from './scripts'

export async function closeWorkspaceTerminal(
  provider: Pick<SandboxProvider, 'runCommand'>,
  sandboxId: string,
  terminalId: string,
): Promise<void> {
  if (!isAdditionalTerminalId(terminalId))
    throw new ProviderError('invalid_request', 400)
  const session = `terminal-${terminalId}`
  const socket = `${TERMINAL_RUNTIME}/tmux.sock`
  const command = `set -eu
if error=$(LC_ALL=C /usr/bin/tmux -N -S ${shellArgument(socket)} kill-session -t ${shellArgument(`=${session}`)} 2>&1); then
  exit 0
else
  status=$?
fi
if [ "$status" -eq 1 ]; then
  case "$error" in
    ${shellArgument(`can't find session: ${session}`)}|'no current target'|${shellArgument(`no server running on ${socket}`)}|${shellArgument(`error connecting to ${socket} (No such file or directory)`)}) exit 0 ;;
  esac
fi
printf '%s\\n' "$error" >&2
exit "$status"`
  const result = await provider.runCommand(
    sandboxId,
    privilegedCommand(
      `/usr/sbin/runuser -u user -- /bin/sh -c ${shellArgument(command)}`,
    ),
  )
  if (result.exitCode !== 0 || result.timedOut)
    throw new ProviderError('unavailable', 502)
}
