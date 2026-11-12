import {
  WORKSPACE_TOOL_SOURCE_PATHS,
  type WorkspaceToolSource,
} from '../../tools/image-manifest'
import type { CommandResult } from '../sandbox/provider'
import { privilegedCommand, shellArgument } from '../terminal/privileged'
import { imageNodeExecutable } from '../lifecycle/image-runtime'
import { WORKSPACE_TOOLS_MCP } from '../../src/shared/agent-tools'
import { TOOL_ENV } from '../../tools/context'

/** @public Image installation checks identify the tools by this path. */
export const WORKSPACE_TOOLS_DIRECTORY = '/opt/conductive/agent-tools'
export const WORKSPACE_TOOLS_COMMAND = WORKSPACE_TOOLS_MCP.command
export const WORKSPACE_TOOLS_SECRETS_FILE = '/run/ascii-secrets/env.sh'

/**
 * Linux refuses one exec argument of 128 KiB or more (`MAX_ARG_STRLEN`). The
 * sandbox runs each command as one shell argument, and the sudo wrapper
 * escapes each quote again. So each install command, with that wrapper,
 * stays under this size, with room for the provider's own wrapper.
 */
export const WORKSPACE_TOOLS_COMMAND_BYTES = 64 * 1024

/** Build the same install commands, in order, for execution and versioning. */
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
  return commandBatches([
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

const BATCH_START = 'set -eu'

/**
 * Group the steps in order into commands under the size limit. No step
 * needs the shell state of an earlier step, so each command starts afresh.
 * A step that alone passes the limit gets its own command, and the provider
 * then reports the failure.
 */
function commandBatches(steps: readonly string[]): string[] {
  const start = utf8Bytes(privilegedCommand(BATCH_START))
  const batches: string[][] = []
  let batch: string[] = []
  let size = 0
  for (const step of steps) {
    // The wrapper escapes each character alone, so the sizes add up.
    const added = utf8Bytes(shellArgument(`\n${step}`)) - 2
    if (batch.length === 0 || size + added > WORKSPACE_TOOLS_COMMAND_BYTES) {
      batch = [BATCH_START]
      batches.push(batch)
      size = start
    }
    batch.push(step)
    size += added
  }
  return batches.map((lines) => lines.join('\n'))
}

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length
}

function write(path: string, contents: string, mode: string): string {
  return `printf %s ${quote(contents)} > ${quote(path)}\nchmod ${mode} ${quote(path)}`
}

function quote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}
