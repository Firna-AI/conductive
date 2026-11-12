// The ChatGPT egress proxy server. OpenAI refuses the chatgpt.com requests
// that a Cloudflare Worker sends, so the model gateway sends them here.
import { createHash, timingSafeEqual } from 'node:crypto'
import {
  createServer,
  type ClientRequest,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type OutgoingHttpHeaders,
  type Server,
  type ServerResponse,
} from 'node:http'
import { request as httpsRequest } from 'node:https'
import { pipeline } from 'node:stream'

export const SECRET_HEADER = 'x-conductive-egress-secret'
export const ORIGIN_HEADER = 'x-conductive-egress-origin'

/** How the proxy trusts its caller. */
export type EgressAccess =
  | { kind: 'secret'; secret: string }
  // Only the egress Worker can reach the port of the container.
  | { kind: 'private-network' }

interface UpstreamRequest {
  method: string
  path: string
  headers: OutgoingHttpHeaders
}

/** Opens the request to OpenAI. Tests replace it with a local server. */
export type Upstream = (
  origin: URL,
  request: UpstreamRequest,
  reply: (response: IncomingMessage) => void,
) => ClientRequest

export interface EgressServerOptions {
  access: EgressAccess
  upstream?: Upstream
  log?: (line: string) => void
}

// Cloudflare, a tunnel, and the connection add these. OpenAI never sees them.
const droppedRequest = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
  'cdn-loop',
  'forwarded',
  'via',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
  'true-client-ip',
  SECRET_HEADER,
  ORIGIN_HEADER,
])
const droppedResponse = new Set([
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'trailer',
  'upgrade',
])

const openAi: Upstream = (origin, request, reply) =>
  httpsRequest(
    {
      host: origin.hostname,
      servername: origin.hostname,
      port: 443,
      ...request,
    },
    reply,
  )

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

function authorized(
  access: EgressAccess,
  value: string | string[] | undefined,
): boolean {
  if (access.kind === 'private-network') return true
  if (typeof value !== 'string') return false
  return timingSafeEqual(digest(value), digest(access.secret))
}

/** Only an https ChatGPT origin with no path, port, or credentials is allowed. */
function allowedOrigin(value: string | string[] | undefined): URL | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    const chatgpt =
      url.hostname === 'chatgpt.com' || url.hostname.endsWith('.chatgpt.com')
    const plain =
      !url.port &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
    return url.protocol === 'https:' && chatgpt && plain ? url : null
  } catch {
    return null
  }
}

function upstreamHeaders(
  headers: IncomingHttpHeaders,
  host: string,
): OutgoingHttpHeaders {
  const result: OutgoingHttpHeaders = { host }
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || droppedRequest.has(name)) continue
    if (name.startsWith('cf-')) continue
    result[name] = value
  }
  return result
}

function refuse(response: ServerResponse, status: number, message: string) {
  if (!response.headersSent)
    response.writeHead(status, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ error: message }))
}

/** The log names the method, the path, and the status, never a body or a header value. */
export function createEgressServer(options: EgressServerOptions): Server {
  const upstream = options.upstream ?? openAi
  const log = options.log ?? ((line: string) => console.log(line))
  const server = createServer((request, response) => {
    const started = Date.now()
    const path = request.url ?? ''
    const label = `${request.method} ${path.split('?')[0]}`
    if (!authorized(options.access, request.headers[SECRET_HEADER])) {
      request.resume()
      return refuse(response, 403, 'forbidden')
    }
    const origin = allowedOrigin(request.headers[ORIGIN_HEADER])
    if (!origin || !path.startsWith('/')) {
      request.resume()
      return refuse(response, 400, 'destination not allowed')
    }
    const call = upstream(
      origin,
      {
        method: request.method ?? 'GET',
        path,
        headers: upstreamHeaders(request.headers, origin.hostname),
      },
      (reply) => {
        const headers: OutgoingHttpHeaders = {}
        for (const [name, value] of Object.entries(reply.headers))
          if (value !== undefined && !droppedResponse.has(name))
            headers[name] = value
        response.writeHead(reply.statusCode ?? 502, headers)
        response.flushHeaders()
        // An answer that OpenAI ends early also ends the caller's connection,
        // so that the agent does not wait for a timeout.
        pipeline(reply, response, (error) => {
          const seconds = ((Date.now() - started) / 1000).toFixed(1)
          if (error)
            log(`${label} ${reply.statusCode} ended early after ${seconds}s`)
          else log(`${label} ${reply.statusCode} ${seconds}s`)
        })
      },
    )
    call.on('error', (error) => {
      log(`${label} failed: ${error.message}`)
      if (response.headersSent) response.destroy(error)
      else refuse(response, 502, 'upstream failed')
    })
    response.on('close', () => {
      if (!response.writableFinished) call.destroy()
    })
    request.pipe(call)
  })
  // A model answer can stream for many minutes.
  server.requestTimeout = 0
  server.timeout = 0
  server.keepAliveTimeout = 65_000
  return server
}

/**
 * Takes no new connection, lets each open request finish, and resolves when
 * the last connection closes. Cloudflare waits up to 15 minutes after it asks
 * a replaced container to stop.
 */
export function drainEgressServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    // A connection that waits for its next request would hold the close.
    const idle = setInterval(() => server.closeIdleConnections(), 1_000)
    server.close((error) => {
      clearInterval(idle)
      if (error) reject(error)
      else resolve()
    })
    server.closeIdleConnections()
  })
}
