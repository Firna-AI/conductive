import type { WorkspaceLinkContext } from '../data/workspace-link'
import type {
  WorkspaceSockets,
  NativeSocketAttachment,
} from '../native-sockets'
import type { BrowserAccess } from './browser-authorization'
import { BrowserTabs, type BrowserRegistration } from './browser-tabs'
import { subscribeBrowser } from './browser-subscription'
import type { ChatOperation } from './operation'
import type { ChatStore } from './store'
import type { BrowserPeer, ChatDependencies } from './types'
import type { WorkspaceEventLabels } from './workspace-event-labels'
import { presentWorkspaceMessage } from './workspace-events'
import { browserRegistration } from './browser-registration'
import type {
  BrowserEventForm,
  BrowserEventsCursor,
} from './browser-event-forms'

export interface NativeBrowserConnections {
  sockets: WorkspaceSockets
  storage: DurableObjectStorage
}

/** A socket has one presented peer throughout registration and removal. */
export class BrowserConnections extends BrowserTabs {
  private readonly connections = new WeakMap<WebSocket, BrowserPeer>()
  private readonly store: ChatStore
  private readonly operation: (id: string) => ChatOperation
  private readonly bind: (id: string) => void
  private readonly native?: NativeBrowserConnections

  constructor(
    store: ChatStore,
    dependencies: ChatDependencies,
    operation: (id: string) => ChatOperation,
    bind: (id: string) => void,
    native?: NativeBrowserConnections,
  ) {
    super(dependencies)
    this.store = store
    this.operation = operation
    this.bind = bind
    this.native = native
    native?.sockets.register('browser', {
      restore: (socket, state) => this.restoreSocket(socket, state),
      message: async () => undefined,
      close: (socket, state) => this.closeSocket(socket, state),
    })
  }

  async subscribe(
    access: BrowserAccess,
    { after, forms }: BrowserEventsCursor,
    peer: BrowserPeer,
    socket?: WebSocket,
    registered?: () => void,
  ): Promise<() => void> {
    return this.store.run(async () => {
      const labels = await this.store.eventLabels(access.workspace.id).prepare()
      const presented = this.present(peer, access.presentation, labels, forms)
      let persist:
        | ((registration: BrowserRegistration | null) => Promise<void>)
        | undefined
      if (socket) {
        const native = this.native
        if (!native) throw new Error('The native browser transport is missing.')
        const id = crypto.randomUUID()
        native.sockets.accept(socket, {
          version: 1,
          role: 'browser',
          id,
          generation: 1,
          presentation: {
            origin: access.presentation.origin,
            number: access.presentation.number,
          },
          forms,
        })
        this.connections.set(socket, presented)
        persist = this.stateWriter(id)
      }
      return subscribeBrowser({
        store: this.store,
        browsers: this,
        operation: this.operation(access.workspace.id),
        access,
        after,
        peer: presented,
        persist,
        registered,
      })
    })
  }

  private present(
    peer: BrowserPeer,
    presentation: WorkspaceLinkContext,
    labels: WorkspaceEventLabels,
    forms?: readonly BrowserEventForm[],
  ) {
    return {
      forms,
      send: (message: Parameters<typeof presentWorkspaceMessage>[0]) =>
        peer.send(
          presentWorkspaceMessage(labels.message(message), presentation),
        ),
      close: () => peer.close(),
    }
  }

  private stateWriter(id: string) {
    const storage = this.native?.storage
    if (!storage) throw new Error('The native browser storage is missing.')
    return async (state: BrowserRegistration | null) => {
      if (state) await storage.put(`native:browser:${id}`, state)
      else await storage.delete(`native:browser:${id}`)
    }
  }

  private async registration(state: NativeSocketAttachment) {
    if (state.role !== 'browser' || state.generation !== 1) return null
    const stored: unknown = await this.native?.storage.get(
      `native:browser:${state.id}`,
    )
    const registration = browserRegistration(stored)
    if (!registration) return null
    this.bind(registration.identity.workspaceId)
    return {
      registration,
      forms: state.forms,
      presentation: {
        ...state.presentation,
        orgId: registration.identity.orgId,
        workspaceId: registration.identity.workspaceId,
      },
    }
  }

  private async restoreSocket(
    socket: WebSocket,
    state: NativeSocketAttachment,
  ): Promise<boolean> {
    const saved = await this.registration(state)
    if (!saved) return false
    const labels = await this.store
      .eventLabels(saved.presentation.workspaceId)
      .prepare()
    const peer = this.present(
      {
        send: (message) => socket.send(JSON.stringify(message)),
        close: () => socket.close(1000, 'Connection closed.'),
      },
      saved.presentation,
      labels,
      saved.forms,
    )
    this.connections.set(socket, peer)
    await this.restore(peer, saved.registration, this.stateWriter(state.id))
    return true
  }

  private async closeSocket(
    socket: WebSocket,
    state: NativeSocketAttachment,
  ): Promise<void> {
    let peer = this.connections.get(socket)
    this.connections.delete(socket)
    if (!peer && (await this.restoreSocket(socket, state))) {
      peer = this.connections.get(socket)
      this.connections.delete(socket)
    }
    if (peer) this.remove(peer)
    if (socket.readyState !== WebSocket.CLOSED) {
      try {
        socket.close(1000, 'Connection closed.')
      } catch {
        /* The connection can already have an outgoing close frame. */
      }
    }
  }
}
