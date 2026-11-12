import { Container, getContainer } from '@cloudflare/containers'
import { pinProxyImage } from './pinned-image'
import { relayAnswer } from './relay'

interface EgressEnv {
  EGRESS: DurableObjectNamespace<ChatGptEgress>
  VERSION: WorkerVersionMetadata
}

/** Runs the egress proxy, which sends ChatGPT requests to OpenAI. */
export class ChatGptEgress extends Container<EgressEnv> {
  override defaultPort = 8080
  override sleepAfter = '15m'
  override enableInternet = true

  constructor(...args: ConstructorParameters<typeof Container<EgressEnv>>) {
    super(...args)
    // Each object starts the image of its own Worker version, so a deploy
    // replaces no running container.
    pinProxyImage(this, args[0])
  }

  override async fetch(request: Request): Promise<Response> {
    const answer = await this.containerFetch(request, this.defaultPort)
    return relayAnswer(
      answer,
      (work) => this.ctx.waitUntil(work),
      () => this.renewActivityTimeout(),
    )
  }
}

export default {
  fetch(request, env) {
    // Each version has its own instance. A new version takes new requests at
    // once, and the instance of the old version finishes its open answers.
    const name = `chatgpt-egress-${env.VERSION.id}`
    return getContainer(env.EGRESS, name).fetch(request)
  },
} satisfies ExportedHandler<EgressEnv>
