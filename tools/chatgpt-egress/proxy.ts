// The ChatGPT egress proxy. OpenAI blocks Cloudflare Worker traffic on
// chatgpt.com, so the model gateway sends those requests here, through a
// named Cloudflare Tunnel. Run: node tools/chatgpt-egress/proxy.ts
import { createHash, timingSafeEqual } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
  createServer,
  type IncomingHttpHeaders,
  type OutgoingHttpHeaders,
  type ServerResponse,
} from 'node:http'
import { request as httpsRequest } from 'node:https'

const SECRET_HEADER = 'x-conductive-egress-secret'
const ORIGIN_HEADER = 'x-conductive-egress-origin'

// Cloudflare, the tunnel, and the connection add these. OpenAI never sees them.
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

function readSecret(): string {
  const file = process.env.CHATGPT_EGRESS_SECRET_FILE
  const value = file
    ? readFileSync(file, 'utf8')
    : (process.env.CHATGPT_EGRESS_SECRET ?? '')
  return value.trim()
}

const secret = readSecret()
if (secret.length < 32) {
  console.error('Set CHATGPT_EGRESS_SECRET or CHATGPT_EGRESS_SECRET_FILE.')
  console.error('The secret needs at least 32 characters.')
  process.exit(1)
}
const secretDigest = createHash('sha256').update(secret).digest()
const port = Number(process.env.PORT ?? '8789')

function authorized(value: string | string[] | undefined): boolean {
  if (typeof value !== 'string') return false
  const digest = createHash('sha256').update(value).digest()
  return timingSafeEqual(digest, secretDigest)
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

const server = createServer((request, response) => {
  const started = Date.now()
  const path = request.url ?? ''
  if (!authorized(request.headers[SECRET_HEADER])) {
    request.resume()
    return refuse(response, 403, 'forbidden')
  }
  const origin = allowedOrigin(request.headers[ORIGIN_HEADER])
  if (!origin || !path.startsWith('/')) {
    request.resume()
    return refuse(response, 400, 'destination not allowed')
  }
  const upstream = httpsRequest(
    {
      host: origin.hostname,
      servername: origin.hostname,
      port: 443,
      method: request.method,
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
      reply.pipe(response)
      reply.on('end', () => {
        const pathname = path.split('?')[0]
        const seconds = ((Date.now() - started) / 1000).toFixed(1)
        console.log(
          `${request.method} ${pathname} ${reply.statusCode} ${seconds}s`,
        )
      })
    },
  )
  upstream.on('error', (error) => {
    console.error(
      `${request.method} ${path.split('?')[0]} failed:`,
      error.message,
    )
    if (response.headersSent) response.destroy(error)
    else refuse(response, 502, 'upstream failed')
  })
  response.on('close', () => {
    if (!response.writableFinished) upstream.destroy()
  })
  request.pipe(upstream)
})

// A model answer can stream for many minutes.
server.requestTimeout = 0
server.timeout = 0
server.keepAliveTimeout = 65_000
server.listen(port, '127.0.0.1', () => {
  console.log(`ChatGPT egress proxy listens on http://127.0.0.1:${port}`)
})
