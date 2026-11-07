import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'

import type { BrowserRunners } from './browser-runners.test-support'

export async function browserControls(runners: BrowserRunners) {
  const token = randomUUID()
  const server = createServer((request, response) => {
    request.resume()
    const answer = (status: number, body: unknown) => {
      response.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      })
      response.end(JSON.stringify(body))
    }
    if (request.headers.authorization !== `Bearer ${token}`) {
      answer(401, { error: 'control_token_required' })
      return
    }
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
    if (request.method === 'GET' && path === '/status') {
      answer(200, runners.status())
      return
    }
    const match = path.match(/^\/workspaces\/([^/]+)\/(stop|reconnect)$/)
    if (request.method !== 'POST' || !match) {
      answer(404, { error: 'control_not_found' })
      return
    }
    let workspaceId: string
    try {
      workspaceId = decodeURIComponent(match[1])
    } catch {
      answer(400, { error: 'invalid_workspace_id' })
      return
    }
    const operation =
      match[2] === 'stop'
        ? runners.stop(workspaceId)
        : runners.reconnect(workspaceId)
    void operation.then(
      (result) => answer(200, result),
      (error: unknown) =>
        answer(409, {
          error:
            error instanceof Error
              ? error.message
              : 'The fake provider control failed.',
        }),
    )
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('The local control address is missing.')
  return {
    origin: `http://127.0.0.1:${address.port}`,
    token,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
        server.closeIdleConnections()
      }),
  }
}
