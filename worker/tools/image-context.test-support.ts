import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'

import { fakeMacRequest } from '../../src/test-support/fixtures/devices'
import { workspaceFixtures } from '../../src/test-support/fixtures/workspaces'
import { DEVICE_COMMAND_PATH } from '../../src/shared/device'
import { sessionLink } from '../../src/shared/session-link'
import { TOOL_ENV, TOOL_TURN_HEADER } from '../../tools/context'
import { imageNodeExecutable } from '../lifecycle/image-runtime'
import {
  installWorkspaceTools,
  WORKSPACE_TOOLS_COMMAND,
  WORKSPACE_TOOLS_SECRETS_FILE,
} from './image'
import { WORKSPACE_TOOL_SOURCES } from './image-assets'
import { imageTestProcess } from './image-test-process'

export async function installedToolContext() {
  const base = resolve('.context/milestone-15i/backend')
  await mkdir(base, { recursive: true })
  const directory = await mkdtemp(join(base, "launcher's "))
  const requests: {
    path: string
    authorization: string | undefined
    turn: string | undefined
  }[] = []
  const workspace = workspaceFixtures().detail.workspace
  const server = createServer((request, response) => {
    const turn = request.headers[TOOL_TURN_HEADER.toLowerCase()]
    requests.push({
      path: request.url ?? '',
      authorization: request.headers.authorization,
      turn: typeof turn === 'string' ? turn : undefined,
    })
    const value =
      request.url === DEVICE_COMMAND_PATH
        ? {
            request: fakeMacRequest({
              state: 'completed',
              result: {
                stdout: 'done',
                stderr: '',
                exitCode: 0,
                timedOut: false,
                truncated: false,
              },
            }),
          }
        : {
            workspace,
            sessionId: 'created-session',
            sessionLink: sessionLink(
              new URL(workspace.link).origin,
              workspace.orgId,
              workspace.id,
              'created-session',
            ),
          }
    request.resume()
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(value))
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Missing tool test address')
  const origin = `http://127.0.0.1:${address.port}`
  try {
    await installWorkspaceTools(
      WORKSPACE_TOOL_SOURCES,
      (command) => imageTestProcess('/bin/sh', ['-c', command]),
      directory,
    )
    const node = imageNodeExecutable(directory)
    await mkdir(dirname(node), { recursive: true })
    await symlink(process.execPath, node)
    const secrets = join(directory, WORKSPACE_TOOLS_SECRETS_FILE)
    await mkdir(dirname(secrets), { recursive: true })
    const save = (machineOrigin: string, token: string, turnId: string) =>
      writeFile(
        secrets,
        `${TOOL_ENV.machineOrigin}='${machineOrigin}'\n${TOOL_ENV.workspaceToken}='${token}'\n${TOOL_ENV.turnId}='${turnId}'\n`,
        { mode: 0o600 },
      )
    await save('http://127.0.0.1:1', 'stale-saved-token', '')
    return {
      requests,
      executable: join(directory, WORKSPACE_TOOLS_COMMAND),
      runtime: {
        [TOOL_ENV.machineOrigin]: origin,
        [TOOL_ENV.workspaceToken]: 'active-scoped-token',
        [TOOL_ENV.turnId]: 'original-runtime-turn',
      },
      fallback: () =>
        save(origin, 'saved-fallback-token', 'saved-fallback-turn'),
      dispose: async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()))
        await rm(directory, { recursive: true, force: true })
      },
    }
  } catch (error) {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await rm(directory, { recursive: true, force: true })
    throw error
  }
}
