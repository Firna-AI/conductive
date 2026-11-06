import type { AppEnv } from '../env'
import { workspaceTarget } from '../previews/access'
import { WorkspaceTools } from '../previews/provider'
import type { ToolDependencies } from '../previews/types'
import { ProviderError } from '../sandbox/errors'
import type { SandboxProvider } from '../sandbox/provider'
import { terminalPassword } from './credentials'

export const TERMINAL_PORT = 7681

const installScript = `set -eu
apt-get update
apt-get install -y ttyd
install -d -m 755 /usr/local/lib/conducting
cat > /usr/local/lib/conducting/terminal <<'CONDUCTING_TERMINAL'
#!/bin/sh
set -eu
exec /usr/bin/ttyd --interface 0.0.0.0 --port 7681 --writable --credential "conducting:$(cat /run/conducting-terminal/password)" /bin/bash -l
CONDUCTING_TERMINAL
chmod 755 /usr/local/lib/conducting/terminal
cat > /etc/systemd/system/conducting-terminal.service <<'CONDUCTING_SERVICE'
[Unit]
Description=Conducting terminal
After=network.target
ConditionPathExists=/run/conducting-terminal/password

[Service]
Type=simple
ExecStart=/usr/local/lib/conducting/terminal
Restart=on-failure
RestartSec=1

[Install]
WantedBy=multi-user.target
CONDUCTING_SERVICE
systemctl daemon-reload
systemctl enable conducting-terminal.service`

/** Call during each org image build. It enables the service without a credential. */
export async function installTerminalService(
  provider: Pick<SandboxProvider, 'runCommand'>,
  sandboxId: string,
): Promise<void> {
  const result = await provider.runCommand(sandboxId, installScript)
  if (result.exitCode !== 0 || result.timedOut)
    throw new ProviderError('unavailable', 502)
}

/** Call after sandbox ownership is stored, at create and every resume, before ready. */
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
  const password = await terminalPassword(env, workspaceId, dependencies.now())
  if (!password || !/^[A-Za-z0-9_-]+$/.test(password))
    throw new ProviderError('invalid_response', 502)
  const command = `set -eu
install -d -m 700 /run/conducting-terminal
umask 077
printf '%s' '${password}' > /run/conducting-terminal/password
systemctl restart conducting-terminal.service
systemctl is-active --quiet conducting-terminal.service`
  const result = await provider.command(command)
  if (result.exitCode !== 0 || result.timedOut)
    throw new ProviderError('unavailable', 502)
}
