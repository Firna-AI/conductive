import { describe, expect, it } from 'vitest'
import { pinProxyImage, PROXY_IMAGE } from './pinned-image'

const image = 'registry.cloudflare.com/account/egress@sha256:abc'

/** A container stand-in that records each start, as the runtime gets it. */
function fakeContainer() {
  const starts: ContainerStartupOptions[] = []
  const ports: number[] = []
  const port = { fetch: () => Promise.resolve(new Response('ok')) }
  const container = {
    running: false,
    images: { [PROXY_IMAGE]: image },
    start(options?: ContainerStartupOptions) {
      if (options) starts.push(options)
      this.running = true
    },
    getTcpPort(number: number) {
      ports.push(number)
      return port
    },
  }
  return { starts, ports, container, port }
}

describe('pinProxyImage', () => {
  it('starts the container helper on the proxy image of the version', () => {
    const fake = fakeContainer()
    const helper = { container: fake.container }
    pinProxyImage(helper, { container: fake.container })

    const pinned = helper.container
    expect(pinned).not.toBe(fake.container)
    pinned.start({ enableInternet: true, env: { A: '1' } })

    expect(fake.starts).toEqual([
      {
        entrypoint: undefined,
        enableInternet: true,
        env: { A: '1' },
        instance: undefined,
        labels: undefined,
        image,
      },
    ])
    expect(pinned.running).toBe(true)
    expect(pinned.getTcpPort(8080)).toBe(fake.port)
    expect(fake.ports).toEqual([8080])
  })

  it('refuses a helper that keeps its container in another field', () => {
    const fake = fakeContainer()
    expect(() => pinProxyImage({}, { container: fake.container })).toThrow(
      'The container helper keeps its container elsewhere now.',
    )
  })
})
