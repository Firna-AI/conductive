import {
  WORKSPACE_TOOL_SOURCE_PATHS,
  type WorkspaceToolSource,
} from '../../tools/image-manifest'
import type { CommandResult } from '../sandbox/provider'

export const WORKSPACE_TOOLS_DIRECTORY = '/opt/conducting/agent-tools'
export const WORKSPACE_TOOLS_COMMAND = '/usr/local/bin/conducting'
export const WORKSPACE_TOOLS_SECRETS_FILE = '/run/ascii-secrets/env.sh'

/** Merge this server into each agent's MCP configuration at runtime. */
export const WORKSPACE_TOOLS_MCP = {
  command: WORKSPACE_TOOLS_COMMAND,
  args: ['mcp'],
} as const

/** Bind run to an authorized image-build sandbox, before its snapshot is saved. */
export async function installWorkspaceTools(
  sources: readonly WorkspaceToolSource[],
  run: (command: string) => Promise<CommandResult>,
  root = '/',
): Promise<void> {
  const prefix = root.replace(/\/+$/, '')
  const directory = `${prefix}${WORKSPACE_TOOLS_DIRECTORY}`
  const executable = `${prefix}${WORKSPACE_TOOLS_COMMAND}`
  const secrets = `${prefix}${WORKSPACE_TOOLS_SECRETS_FILE}`
  const launcher = `#!/bin/sh
set -eu
if [ -r ${quote(secrets)} ]; then
  set -a
  . ${quote(secrets)}
  set +a
fi
exec node ${quote(`${directory}/tools/main.ts`)} "$@"
`
  const assets = new Map(
    sources.map((source) => [source.path, source.contents]),
  )
  const writes = WORKSPACE_TOOL_SOURCE_PATHS.map((path) => {
    const source = assets.get(path)
    if (source === undefined)
      throw new Error('The workspace tool sources are incomplete.')
    return write(`${directory}/${path}`, source, '0644')
  })
  const command = [
    'set -eu',
    `install -d ${quote(`${directory}/tools`)} ${quote(`${directory}/src/shared`)} ${quote(`${prefix}/usr/local/bin`)}`,
    ...writes,
    write(`${directory}/package.json`, '{"type":"module"}\n', '0644'),
    write(executable, launcher, '0755'),
  ].join('\n')
  const result = await run(command)
  if (result.exitCode !== 0 || result.timedOut) {
    throw new Error('The workspace tools could not be installed.')
  }
}

function write(path: string, contents: string, mode: string): string {
  const bytes = new TextEncoder().encode(contents)
  const encoded = btoa(
    Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''),
  )
  return `printf %s '${encoded}' | base64 -d > ${quote(path)}\nchmod ${mode} ${quote(path)}`
}

function quote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}
