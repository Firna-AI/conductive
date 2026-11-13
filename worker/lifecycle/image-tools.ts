import { privilegedCommand } from '../terminal/privileged'
import {
  WORKSPACE_TOOLS_COMMAND,
  WORKSPACE_TOOLS_DIRECTORY,
} from '../tools/image'
import { shellQuote } from './commands'
import { imageNodeExecutable } from './image-runtime'

const legacyCommand = `${WORKSPACE_TOOLS_DIRECTORY}/conductive`
const releaseNode = '/opt/conductive/current/node/bin/node'

export function imageToolsCommand(command: string): string {
  const source = shellQuote(WORKSPACE_TOOLS_COMMAND)
  const destination = shellQuote(legacyCommand)
  return privilegedCommand(
    command
      .replaceAll(` > ${source}`, ` > ${destination}`)
      .replaceAll(`chmod 0755 ${source}`, `chmod 0755 ${destination}`)
      .replaceAll(imageNodeExecutable(), releaseNode),
  )
}

export function migrateImageToolsCommand(): string {
  const source = shellQuote(WORKSPACE_TOOLS_COMMAND)
  const destination = shellQuote(legacyCommand)
  return `if [ ! -e ${destination} ] && [ -f ${source} ] && [ ! -L ${source} ]; then
  sed 's|/opt/conductive/runtime/[^/]*/bin/node|${releaseNode}|g' ${source} > ${destination}
  chmod 755 ${destination}
fi
`
}
