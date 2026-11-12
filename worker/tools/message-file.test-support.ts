import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'

import { TOOL_ENV } from '../../tools/context'
import { imageNodeExecutable } from '../lifecycle/image-runtime'
import { installWorkspaceTools, WORKSPACE_TOOLS_COMMAND } from './image'
import { WORKSPACE_TOOL_SOURCES } from './image-assets'
import { imageTestProcess } from './image-test-process'
import {
  TOOL_TEST_ENVIRONMENT,
  TOOL_TEST_ORIGIN,
  type ToolFixture,
} from './test-support'

export async function installedHandlerTools(fixture: ToolFixture) {
  const base = resolve('.context/agent-tools-conductor-parity/m6/process')
  await mkdir(base, { recursive: true })
  const directory = await mkdtemp(join(base, "message tool's "))
  const handle = async (
    incoming: IncomingMessage,
    outgoing: ServerResponse,
  ) => {
    incoming.setEncoding('utf8')
    let body = ''
    for await (const chunk of incoming) body += String(chunk)
    const headers = new Headers()
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (value !== undefined)
        headers.set(name, Array.isArray(value) ? value.join(', ') : value)
    }
    const response = await fixture.send(
      new Request(new URL(incoming.url ?? '/', TOOL_TEST_ORIGIN), {
        method: incoming.method,
        headers,
        ...(body && { body }),
      }),
    )
    outgoing.writeHead(response.status, Object.fromEntries(response.headers))
    outgoing.end(await response.text())
  }
  const server = createServer((incoming, outgoing) => {
    void handle(incoming, outgoing).catch((error: unknown) => {
      outgoing.writeHead(500)
      outgoing.end(String(error))
    })
  })
  const dispose = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
    await rm(directory, { recursive: true, force: true })
  }
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (!address || typeof address === 'string')
      throw new Error('Missing test address')
    await installWorkspaceTools(
      WORKSPACE_TOOL_SOURCES,
      (command) => imageTestProcess('/bin/sh', ['-c', command]),
      directory,
    )
    const node = imageNodeExecutable(directory)
    await mkdir(dirname(node), { recursive: true })
    await symlink(process.execPath, node)
    return {
      directory,
      executable: join(directory, WORKSPACE_TOOLS_COMMAND),
      environment: {
        ...TOOL_TEST_ENVIRONMENT,
        [TOOL_ENV.machineOrigin]: `http://127.0.0.1:${address.port}`,
      },
      dispose,
    }
  } catch (error) {
    await dispose()
    throw error
  }
}
