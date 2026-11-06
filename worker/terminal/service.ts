import type { AppEnv } from '../env'
import { workspaceTarget } from '../previews/access'
import { WorkspaceTools } from '../previews/provider'
import type { ToolDependencies } from '../previews/types'
import { ProviderError } from '../sandbox/errors'
import type { SandboxProvider } from '../sandbox/provider'
import { cacheTerminalPassword } from './credentials'
import { privilegedCommand } from './privileged'
import { credentialScript, launcherScript } from './scripts'
import { TERMINAL_RUNTIME } from './scripts'

export const TERMINAL_PORT = 7681

const installScript = `set -eu
apt-get update
apt-get install -y ttyd
install -d -m 755 /usr/local/lib/conducting
cat > /usr/local/lib/conducting/terminal <<'CONDUCTING_TERMINAL'
${launcherScript()}
CONDUCTING_TERMINAL
chmod 755 /usr/local/lib/conducting/terminal
cat > /usr/local/lib/conducting/terminal-password <<'CONDUCTING_PASSWORD'
${credentialScript()}
CONDUCTING_PASSWORD
chmod 755 /usr/local/lib/conducting/terminal-password
cat > /etc/systemd/system/conducting-terminal.service <<'CONDUCTING_SERVICE'
[Unit]
Description=Conducting terminal
After=network.target
ConditionPathExists=/run/conducting-terminal/enabled

[Service]
Type=simple
User=user
Group=user
WorkingDirectory=/home/user
RuntimeDirectory=conducting-terminal
RuntimeDirectoryMode=0700
RuntimeDirectoryPreserve=yes
ExecStartPre=+/usr/local/lib/conducting/terminal-password
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
  const result = await provider.runCommand(
    sandboxId,
    privilegedCommand(installScript),
  )
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
  const command = `set -eu
install -d -m 700 -o user -g user /run/conducting-terminal
touch /run/conducting-terminal/enabled
systemctl start conducting-terminal.service
systemctl is-active --quiet conducting-terminal.service`
  const result = await provider.command(privilegedCommand(command))
  if (result.exitCode !== 0 || result.timedOut)
    throw new ProviderError('unavailable', 502)
  const file = await provider.readFile(`${TERMINAL_RUNTIME}/password`, 64)
  if (file.kind !== 'file') throw new ProviderError('invalid_response', 502)
  let password: string
  try {
    password =
      file.file.encoding === 'base64'
        ? atob(file.file.content)
        : file.file.content
  } catch {
    throw new ProviderError('invalid_response', 502)
  }
  if (file.file.sizeBytes !== 64 || !/^[a-f0-9]{64}$/.test(password))
    throw new ProviderError('invalid_response', 502)
  await cacheTerminalPassword(env, target, password, dependencies.now())
}
