import { DurableObject } from 'cloudflare:workers'
import { proxyFetch } from './container'
import { relayAnswer } from './relay'

interface EgressEnv {
  EGRESS: DurableObjectNamespace<ChatGptEgress>
  VERSION: WorkerVersionMetadata
}

/** Runs the egress proxy, which sends ChatGPT requests to OpenAI. */
export class ChatGptEgress extends DurableObject<EgressEnv> {
  private readonly send: (url: string, request: Request) => Promise<Response>

  constructor(state: DurableObjectState, env: EgressEnv) {
    super(state, env)
    const container = state.container
    if (!container)
      throw new Error('The egress Durable Object has no container.')
    this.send = proxyFetch(container)
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    let answer: Response
    try {
      answer = await this.send(
        `http://proxy${url.pathname}${url.search}`,
        request,
      )
    } catch {
      return new Response('The egress container did not answer.', {
        status: 503,
      })
    }
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
