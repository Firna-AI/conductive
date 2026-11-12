/** The port of the egress proxy in its container. */
export const PROXY_PORT = 8080
/** The key of the proxy image in the `images` map of the Wrangler config. */
export const PROXY_IMAGE = 'proxy'
/** The container stops after this long without a request to its object. */
const IDLE_MS = 15 * 60 * 1000
const READY_TRIES = 100
const READY_WAIT_MS = 200

/** The members of a container that the egress Worker uses. */
interface ProxyContainer {
  readonly running: boolean
  readonly images: Record<string, string>
  start(options: ContainerStartupOptions): void
  monitor(): Promise<void>
  getTcpPort(port: number): Pick<Fetcher, 'fetch'>
  setInactivityTimeout(durationMs: number): Promise<void>
}

export interface ProxyStarterOptions {
  wait?: (ms: number) => Promise<void>
  warn?: (message: string) => void
}

const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Returns a function that resolves when the proxy of the container takes
 * requests. Each start uses the proxy image of this Worker version and
 * reaches the Internet. Requests that arrive during a start share it.
 */
export function proxyStarter(
  container: ProxyContainer,
  options: ProxyStarterOptions = {},
): () => Promise<void> {
  const wait = options.wait ?? pause
  const warn = options.warn ?? ((message: string) => console.warn(message))
  let listening = false
  let monitored = false
  let starting: Promise<void> | undefined

  const watch = () => {
    if (monitored) return
    monitored = true
    const stopped = (reason: unknown) => {
      monitored = false
      listening = false
      if (reason !== undefined)
        warn(`The egress container stopped: ${String(reason)}`)
    }
    container.monitor().then(() => stopped(undefined), stopped)
  }

  const start = async () => {
    if (!container.running) {
      const image = container.images[PROXY_IMAGE]
      if (!image) throw new Error('The egress Worker has no proxy image.')
      container.start({ image, enableInternet: true })
    }
    watch()
    // Keep the container while answers stream, also when the object sleeps.
    await container.setInactivityTimeout(IDLE_MS)
    const port = container.getTcpPort(PROXY_PORT)
    for (let attempt = 1; ; attempt++) {
      try {
        const answer = await port.fetch('http://proxy/ready')
        await answer.body?.cancel()
        listening = true
        return
      } catch (error) {
        if (attempt >= READY_TRIES) throw error
        await wait(READY_WAIT_MS)
      }
    }
  }

  return () => {
    if (listening && container.running) return Promise.resolve()
    starting ??= start().finally(() => {
      starting = undefined
    })
    return starting
  }
}

/**
 * Returns a function that sends one request to the proxy. The runtime gives
 * a port only after the start, so the port comes after the wait.
 */
export function proxyFetch(
  container: ProxyContainer,
  options: ProxyStarterOptions = {},
): (url: string, request: Request) => Promise<Response> {
  const ready = proxyStarter(container, options)
  return async (url, request) => {
    await ready()
    return container.getTcpPort(PROXY_PORT).fetch(url, request)
  }
}
