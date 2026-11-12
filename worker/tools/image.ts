import {
  WORKSPACE_TOOL_SOURCE_PATHS,
  type WorkspaceToolSource,
} from '../../tools/image-manifest'
import type { CommandResult } from '../sandbox/provider'
import { imageNodeExecutable } from '../lifecycle/image-runtime'
import { WORKSPACE_TOOLS_MCP } from '../../src/shared/agent-tools'
import { TOOL_ENV } from '../../tools/context'

/** @public Image installation checks identify the tools by this path. */
export const WORKSPACE_TOOLS_DIRECTORY = '/opt/conductive/agent-tools'
export const WORKSPACE_TOOLS_COMMAND = WORKSPACE_TOOLS_MCP.command
export const WORKSPACE_TOOLS_SECRETS_FILE = '/run/ascii-secrets/env.sh'

/** Build the same install text for execution and software versioning. */
export function workspaceToolsCommand(
  sources: readonly WorkspaceToolSource[],
  root = '/',
): string {
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
  return [
    'set -eu',
    `install -d ${quote(`${directory}/tools`)} ${quote(`${directory}/src/shared`)} ${quote(`${prefix}/usr/local/bin`)}`,
    ...writes,
    write(`${directory}/package.json`, '{"type":"module"}\n', '0644'),
    write(executable, launcher, '0755'),
  ].join('\n')
}

/** Bind run to an authorized image-build sandbox before its snapshot is saved. */
export async function installWorkspaceTools(
  sources: readonly WorkspaceToolSource[],
  run: (command: string) => Promise<CommandResult>,
  root = '/',
): Promise<void> {
  const result = await run(workspaceToolsCommand(sources, root))
  if (result.exitCode !== 0 || result.timedOut) {
    throw new Error('The workspace tools could not be installed.')
  }
}

function write(path: string, contents: string, mode: string): string {
  return `printf %s ${quote(contents)} > ${quote(path)}\nchmod ${mode} ${quote(path)}`
}

function quote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}
