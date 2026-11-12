import { describe, expect, it } from 'vitest'
import { PROXY_IMAGE, PROXY_PORT, proxyFetch, proxyStarter } from './container'

const image = 'registry.cloudflare.com/account/egress@sha256:abc'

/** A container stand-in. Its port refuses `refusals` probes, then answers. */
function fakeContainer(refusals: number) {
  const starts: ContainerStartupOptions[] = []
  const timeouts: number[] = []
  const probes: string[] = []
  const ports: number[] = []
  let exit: (error?: Error) => void = () => {}
  const container = {
    running: false,
    images: { [PROXY_IMAGE]: image },
    start(options: ContainerStartupOptions) {
      starts.push(options)
      container.running = true
    },
    monitor() {
      return new Promise<void>((resolve, reject) => {
        exit = (error?: Error) => {
          container.running = false
          if (error) reject(error)
          else resolve()
        }
      })
    },
    getTcpPort(port: number) {
      // The runtime gives a port only to a started container.
      if (!container.running)
        throw new Error('The container has not been started')
      ports.push(port)
      return {
        fetch(input: RequestInfo | URL, init?: RequestInit) {
          probes.push(`${init?.method ?? 'GET'} ${String(input)}`)
          if (probes.length <= refusals)
            return Promise.reject(new Error('connection refused'))
          return Promise.resolve(new Response('destination not allowed'))
        },
      }
    },
    setInactivityTimeout(durationMs: number) {
      timeouts.push(durationMs)
      return Promise.resolve()
    },
  }
  return {
    container,
    starts,
    timeouts,
    probes,
    ports,
    exit: (error?: Error) => exit(error),
  }
}

describe('proxyStarter', () => {
  it('starts the proxy image with the Internet and waits for its port', async () => {
    const fake = fakeContainer(2)
    const waits: number[] = []
    const ready = proxyStarter(fake.container, {
      wait: async (ms) => {
        waits.push(ms)
      },
    })
    await ready()
    expect(fake.starts).toEqual([{ image, enableInternet: true }])
    expect(fake.timeouts).toEqual([15 * 60 * 1000])
    expect(fake.ports).toEqual([PROXY_PORT])
    expect(fake.probes).toHaveLength(3)
    expect(waits).toEqual([200, 200])
  })

  it('shares one start between requests and probes the port only once', async () => {
    const fake = fakeContainer(0)
    const ready = proxyStarter(fake.container)
    await Promise.all([ready(), ready()])
    await ready()
    expect(fake.starts).toHaveLength(1)
    expect(fake.probes).toHaveLength(1)
  })

  it('warns when the container fails, and starts it again', async () => {
    const fake = fakeContainer(0)
    const warnings: string[] = []
    const ready = proxyStarter(fake.container, {
      warn: (message) => warnings.push(message),
    })
    await ready()
    fake.exit(new Error('exit code 1'))
    await Promise.resolve()
    await ready()
    expect(warnings).toEqual([
      'The egress container stopped: Error: exit code 1',
    ])
    expect(fake.starts).toHaveLength(2)
    expect(fake.probes).toHaveLength(2)
  })

  it('sends a request through the port only after the start', async () => {
    const fake = fakeContainer(0)
    const send = proxyFetch(fake.container)
    const answer = await send(
      'http://proxy/backend-api/codex/models',
      new Request('http://proxy/backend-api/codex/models', { method: 'POST' }),
    )
    expect(await answer.text()).toBe('destination not allowed')
    expect(fake.probes).toEqual([
      'GET http://proxy/ready',
      'POST http://proxy/backend-api/codex/models',
    ])
  })
})
