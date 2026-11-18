import {
  createServer,
  request as httpRequest,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createEgressServer,
  drainEgressServer,
  ORIGIN_HEADER,
  SECRET_HEADER,
  type EgressAccess,
  type Upstream,
} from './egress-server.ts'

const secret = 'egress-secret-egress-secret-egress-secret'
const chatgpt = { [ORIGIN_HEADER]: 'https://chatgpt.com' }
const servers: Server[] = []

function listen(server: Server): Promise<number> {
  servers.push(server)
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address && typeof address !== 'string') resolve(address.port)
      else reject(new Error('The test server has no port.'))
    })
  })
}

interface SeenRequest {
  method: string | undefined
  path: string | undefined
  headers: IncomingHttpHeaders
  body: string
}

/** A local server in place of OpenAI, reached through the upstream hook. */
async function fakeOpenAi(
  respond: (request: IncomingMessage, response: ServerResponse) => void,
) {
  const seen: SeenRequest[] = []
  const origins: string[] = []
  const port = await listen(
    createServer((request, response) => {
      let body = ''
      request.on('data', (chunk: Buffer) => (body += chunk.toString()))
      request.on('end', () => {
        seen.push({
          method: request.method,
          path: request.url,
          headers: request.headers,
          body,
        })
        respond(request, response)
      })
    }),
  )
  const upstream: Upstream = (origin, call, reply) => {
    origins.push(origin.href)
    return httpRequest({ host: '127.0.0.1', port, ...call }, reply)
  }
  return { seen, origins, upstream }
}

async function startProxy(access: EgressAccess, upstream: Upstream) {
  const proxy = createEgressServer({ access, upstream, log: () => undefined })
  const port = await listen(proxy)
  return { proxy, url: `http://127.0.0.1:${port}` }
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.closeAllConnections()
          server.close(() => resolve())
        }),
    ),
  )
})

describe('the ChatGPT egress proxy', () => {
  it('refuses a caller without the shared secret', async () => {
    const openAi = await fakeOpenAi((_, response) => response.end('ok'))
    const { url } = await startProxy(
      { kind: 'secret', secret },
      openAi.upstream,
    )
    const refused = await fetch(`${url}/backend-api/codex/models`, {
      headers: chatgpt,
    })
    const passed = await fetch(`${url}/backend-api/codex/models`, {
      headers: { ...chatgpt, [SECRET_HEADER]: secret },
    })
    expect(refused.status).toBe(403)
    expect(passed.status).toBe(200)
    expect(await passed.text()).toBe('ok')
    expect(openAi.seen).toHaveLength(1)
  })

  it('refuses each origin outside chatgpt.com', async () => {
    const openAi = await fakeOpenAi((_, response) => response.end('ok'))
    const { url } = await startProxy(
      { kind: 'private-network' },
      openAi.upstream,
    )
    for (const origin of [
      'https://example.com',
      'http://chatgpt.com',
      'https://chatgpt.com:8443',
      'https://chatgpt.com.example.com',
    ]) {
      const response = await fetch(`${url}/backend-api/codex/models`, {
        headers: { [ORIGIN_HEADER]: origin },
      })
      expect({ origin, status: response.status }).toEqual({
        origin,
        status: 400,
      })
    }
    expect(openAi.seen).toEqual([])
  })

  it('sends a request to its ChatGPT origin without Cloudflare headers', async () => {
    const openAi = await fakeOpenAi((_, response) => response.end('answer'))
    const { url } = await startProxy(
      { kind: 'private-network' },
      openAi.upstream,
    )
    const response = await fetch(`${url}/backend-api/codex/responses?x=1`, {
      method: 'POST',
      headers: {
        [ORIGIN_HEADER]: 'https://eu.chatgpt.com',
        [SECRET_HEADER]: secret,
        authorization: 'Bearer upstream',
        'cf-connecting-ip': '203.0.113.9',
        'x-forwarded-for': '203.0.113.9',
        'cdn-loop': 'cloudflare',
      },
      body: 'payload',
    })
    expect(await response.text()).toBe('answer')
    expect(openAi.origins).toEqual(['https://eu.chatgpt.com/'])
    const [seen] = openAi.seen
    expect([seen.method, seen.path, seen.body]).toEqual([
      'POST',
      '/backend-api/codex/responses?x=1',
      'payload',
    ])
    expect([seen.headers.host, seen.headers.authorization]).toEqual([
      'eu.chatgpt.com',
      'Bearer upstream',
    ])
    const dropped = [
      ORIGIN_HEADER,
      SECRET_HEADER,
      'cf-connecting-ip',
      'x-forwarded-for',
      'cdn-loop',
    ]
    expect(
      Object.keys(seen.headers).filter((name) => dropped.includes(name)),
    ).toEqual([])
  })

  it('lets an open answer finish and refuses new connections while it drains', async () => {
    let release = () => {}
    const released = new Promise<void>((resolve) => (release = resolve))
    const openAi = await fakeOpenAi((_, response) => {
      response.writeHead(200, { 'content-type': 'text/event-stream' })
      response.write('data: first\n\n')
      void released.then(() => response.end('data: second\n\n'))
    })
    const { proxy, url } = await startProxy(
      { kind: 'private-network' },
      openAi.upstream,
    )
    const answer = await fetch(`${url}/backend-api/codex/responses`, {
      method: 'POST',
      headers: chatgpt,
      body: '{}',
    })
    if (!answer.body) throw new Error('The answer has no body.')
    const reader = answer.body.getReader()
    const decoder = new TextDecoder()
    const first = await reader.read()
    expect(decoder.decode(first.value)).toBe('data: first\n\n')

    const drained = drainEgressServer(proxy)
    await expect(
      fetch(`${url}/backend-api/codex/models`, { headers: chatgpt }),
    ).rejects.toMatchObject({ cause: { code: 'ECONNREFUSED' } })

    release()
    let rest = ''
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      rest += decoder.decode(chunk.value, { stream: true })
    }
    expect(rest).toBe('data: second\n\n')
    await drained
  })

  it('ends the caller connection when OpenAI ends an answer early', async () => {
    const openAi = await fakeOpenAi((_, response) => {
      response.writeHead(200, { 'content-type': 'text/event-stream' })
      response.write('data: first\n\n')
      // A clean close before the end of the chunked answer.
      setImmediate(() => response.destroy())
    })
    const { url } = await startProxy(
      { kind: 'private-network' },
      openAi.upstream,
    )
    const answer = await fetch(`${url}/backend-api/codex/responses`, {
      method: 'POST',
      headers: chatgpt,
      body: '{}',
    })
    if (!answer.body) throw new Error('The answer has no body.')
    const reader = answer.body.getReader()
    const first = await reader.read()
    expect(new TextDecoder().decode(first.value)).toBe('data: first\n\n')
    let outcome = 'pending'
    reader.read().then(
      () => (outcome = 'ended'),
      () => (outcome = 'failed'),
    )
    await vi.waitFor(() => expect(outcome).toBe('failed'), { timeout: 10_000 })
  })
})
