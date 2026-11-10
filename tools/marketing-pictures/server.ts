import { readFile } from 'node:fs/promises'
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import { extname, resolve, sep } from 'node:path'

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

/** Answers with one file of the build, or with 404. It catches each error. */
async function serveFile(
  root: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    const path = decodeURIComponent(
      new URL(request.url ?? '/', 'http://localhost').pathname,
    )
    const file = resolve(root, `.${path}`)
    if (!file.startsWith(`${root}${sep}`)) {
      response.writeHead(404).end()
      return
    }
    const content = await readFile(file)
    response
      .writeHead(200, {
        'Content-Type':
          contentTypes[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      })
      .end(content)
  } catch {
    response.writeHead(404).end()
  }
}

/** Serve this build only, on a free loopback port. */
export async function serveMockups(directory: string) {
  const root = resolve(directory)
  const server = createServer((request, response) => {
    void serveFile(root, request, response)
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string') {
    server.close()
    throw new Error('The mockup server has no local port')
  }
  return {
    origin: `http://127.0.0.1:${address.port}`,
    async close(): Promise<void> {
      const closed = new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
      server.closeAllConnections()
      await closed
    },
  }
}
