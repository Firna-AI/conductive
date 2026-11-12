import {
  WORKSPACE_TOOL_SOURCE_PATHS,
  type WorkspaceToolSource,
} from '../../tools/image-manifest'
import type { CommandResult } from '../sandbox/provider'
import { imageNodeExecutable } from '../lifecycle/image-runtime'
import { WORKSPACE_TOOLS_MCP } from '../../src/shared/agent-tools'
import { TOOL_ENV } from '../../tools/context'
import { privilegedCommand } from '../terminal/privileged'

/** @public Image installation checks identify the tools by this path. */
export const WORKSPACE_TOOLS_DIRECTORY = '/opt/conductive/agent-tools'
export const WORKSPACE_TOOLS_COMMAND = WORKSPACE_TOOLS_MCP.command
export const WORKSPACE_TOOLS_SECRETS_FILE = '/run/ascii-secrets/env.sh'

/**
 * Linux refuses one program argument of 128 KiB or more, and the sandbox runs
 * each privileged command as one argument. This limit, in UTF-8 bytes, leaves
 * room for the provider's own wrapper.
 */
export const WORKSPACE_TOOLS_COMMAND_LIMIT = 64 * 1024

/** Build the same install commands, in order, for execution and software versioning. */
export function workspaceToolsCommands(
  sources: readonly WorkspaceToolSource[],
  root = '/',
): string[] {
  const prefix = root.replace(/\/+$/, '')
  const directory = `${prefix}${WORKSPACE_TOOLS_DIRECTORY}`
  const executable = `${prefix}${WORKSPACE_TOOLS_COMMAND}`
  const secrets = `${prefix}${WORKSPACE_TOOLS_SECRETS_FILE}`
  const node = quote(imageNodeExecutable(root))
  const names = [
    TOOL_ENV.machineOrigin,
    TOOL_ENV.workspaceToken,
    TOOL_ENV.turnId,
  ]
  const inherited = names
    .map((name) => `"\${${name}+x}" "\${${name}-}"`)
    .join(' ')
  const restore = names
    .map((name) => `if [ "$1" = x ]; then\n  export ${name}="$2"\nfi\nshift 2`)
    .join('\n')
  const launcher = `#!/bin/sh
set -eu
set -- ${inherited} "$@"
if [ -r ${quote(secrets)} ]; then
  set -a
  . ${quote(secrets)}
  set +a
fi
${restore}
unset NODE_OPTIONS
if [ -f ${node} ] && [ -x ${node} ]; then
  exec ${node} ${quote(`${directory}/tools/main.ts`)} "$@"
fi
printf '%s\\n' 'Node is not available for the workspace tools.' >&2
exit 1
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
  // The launcher comes last, so the command exists only after its sources.
  return batches([
    `install -d ${quote(`${directory}/tools`)} ${quote(`${directory}/src/shared`)} ${quote(`${prefix}/usr/local/bin`)}`,
    ...writes,
    write(`${directory}/package.json`, '{"type":"module"}\n', '0644'),
    write(executable, launcher, '0755'),
  ])
}

/** Bind run to an authorized image-build sandbox before its snapshot is saved. */
export async function installWorkspaceTools(
  sources: readonly WorkspaceToolSource[],
  run: (command: string) => Promise<CommandResult>,
  root = '/',
): Promise<void> {
  for (const command of workspaceToolsCommands(sources, root)) {
    const result = await run(command)
    if (result.exitCode !== 0 || result.timedOut) {
      throw new Error('The workspace tools could not be installed.')
    }
  }
}

const ENCODER = new TextEncoder()

/** Group the steps in order, so each privileged command stays under the limit. */
function batches(steps: readonly string[]): string[] {
  const commands: string[] = []
  let current = 'set -eu'
  for (const step of steps) {
    const next = `${current}\n${step}`
    if (
      current !== 'set -eu' &&
      ENCODER.encode(privilegedCommand(next)).length >
        WORKSPACE_TOOLS_COMMAND_LIMIT
    ) {
      commands.push(current)
      current = `set -eu\n${step}`
    } else current = next
  }
  commands.push(current)
  return commands
}

function write(path: string, contents: string, mode: string): string {
  return `printf %s ${quote(contents)} > ${quote(path)}\nchmod ${mode} ${quote(path)}`
}

function quote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}
