import { DurableObject } from 'cloudflare:workers'
import { PROXY_PORT, proxyStarter } from './container'
import { relayAnswer } from './relay'

interface EgressEnv {
  EGRESS: DurableObjectNamespace<ChatGptEgress>
  VERSION: WorkerVersionMetadata
}

/** Runs the egress proxy, which sends ChatGPT requests to OpenAI. */
export class ChatGptEgress extends DurableObject<EgressEnv> {
  private readonly port: Fetcher
  private readonly ready: () => Promise<void>

  constructor(state: DurableObjectState, env: EgressEnv) {
    super(state, env)
    const container = state.container
    if (!container)
      throw new Error('The egress Durable Object has no container.')
    this.port = container.getTcpPort(PROXY_PORT)
    this.ready = proxyStarter(container)
  }

  override async fetch(request: Request): Promise<Response> {
    try {
      await this.ready()
    } catch {
      return new Response('The egress container did not start.', {
        status: 503,
      })
    }
    const url = new URL(request.url)
    const answer = await this.port.fetch(
      `http://proxy${url.pathname}${url.search}`,
      request,
    )
    return relayAnswer(answer, (work) => this.ctx.waitUntil(work))
  }
}

export default {
  fetch(request, env) {
    // Each version has its own object and container. A new version takes new
    // requests at once, and the object of the old version finishes its open
    // answers.
    const name = `chatgpt-egress-${env.VERSION.id}`
    return env.EGRESS.getByName(name).fetch(request)
  },
} satisfies ExportedHandler<EgressEnv>
