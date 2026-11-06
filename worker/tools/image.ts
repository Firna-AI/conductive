import {
  WORKSPACE_TOOL_SOURCE_PATHS,
  type WorkspaceToolSource,
} from '../../tools/image-manifest'
import type { CommandResult } from '../sandbox/provider'

export const WORKSPACE_TOOLS_DIRECTORY = '/opt/conducting/agent-tools'
export const WORKSPACE_TOOLS_COMMAND = '/usr/local/bin/conducting'

/** Merge this server into each agent's MCP configuration at runtime. */
export const WORKSPACE_TOOLS_MCP = {
  command: WORKSPACE_TOOLS_COMMAND,
  args: ['mcp'],
} as const

const launcher = `#!/bin/sh
set -eu
if [ -r /run/ascii-secrets/env.sh ]; then
  set -a
  . /run/ascii-secrets/env.sh
  set +a
fi
exec node ${WORKSPACE_TOOLS_DIRECTORY}/tools/main.ts "$@"
`

/** Bind run to an authorized image-build sandbox, before its snapshot is saved. */
export async function installWorkspaceTools(
  sources: readonly WorkspaceToolSource[],
  run: (command: string) => Promise<CommandResult>,
): Promise<void> {
  const assets = new Map(
    sources.map((source) => [source.path, source.contents]),
  )
  const writes = WORKSPACE_TOOL_SOURCE_PATHS.map((path) => {
    const source = assets.get(path)
    if (source === undefined)
      throw new Error('The workspace tool sources are incomplete.')
    return write(`${WORKSPACE_TOOLS_DIRECTORY}/${path}`, source, '0644')
  })
  const command = [
    'set -eu',
    `install -d ${WORKSPACE_TOOLS_DIRECTORY}/tools ${WORKSPACE_TOOLS_DIRECTORY}/src/shared /usr/local/bin`,
    ...writes,
    write(
      `${WORKSPACE_TOOLS_DIRECTORY}/package.json`,
      '{"type":"module"}\n',
      '0644',
    ),
    write(WORKSPACE_TOOLS_COMMAND, launcher, '0755'),
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
  // Both paths and modes come from the manifest, never from a tool request.
  return `printf %s '${encoded}' | base64 -d > '${path}'\nchmod ${mode} '${path}'`
}
