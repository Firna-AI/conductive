import { DurableObject } from 'cloudflare:workers'

import { nativeWorkspaceStorage } from './platform-storage'
import { WorkspaceEventJournal } from './durable-journal'
import { attachWorkspaceSubscription } from './workspace-sockets'

interface JournalFixtureEnvironment {
  JOURNALS: DurableObjectNamespace<JournalFixture>
}

/** Bundled only by the storage/socket integration test. */
export class JournalFixture extends DurableObject<JournalFixtureEnvironment> {
  private readonly journal = new WorkspaceEventJournal(
    nativeWorkspaceStorage(this.ctx.storage),
    async (envelope) => {
      for (const socket of this.ctx.getWebSockets('workspace'))
        socket.send(JSON.stringify({ type: 'event', envelope }))
    },
  )

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/subscribe') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)
      await attachWorkspaceSubscription(
        this.ctx,
        this.journal,
        server,
        Number(url.searchParams.get('after') ?? '0'),
      )
      return new Response(null, { status: 101, webSocket: client })
    }
    const label = url.searchParams.get('label') ?? 'step'
    await this.journal.append(
      'workspace-one',
      {
        type: 'start.updated',
        start: {
          kind: 'create',
          startedAt: 1_800_000_000_000,
          steps: [
            {
              id: label,
              label,
              state: 'completed',
              startedAt: 1_800_000_000_000,
              completedAt: 1_800_000_000_017,
            },
          ],
        },
      },
      1_800_000_000_017,
    )
    return Response.json({ saved: true })
  }

  async webSocketMessage(): Promise<void> {}
  async webSocketClose(
    socket: WebSocket,
    code: number,
    reason: string,
  ): Promise<void> {
    socket.close(code, reason)
  }
}

export default {
  fetch(request: Request, env: JournalFixtureEnvironment) {
    return env.JOURNALS.getByName('workspace-one').fetch(request)
  },
}
