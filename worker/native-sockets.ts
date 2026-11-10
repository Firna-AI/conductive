import type { WorkspaceLinkContext } from './data/workspace-link'

export type NativeSocketRole = 'device' | 'browser' | 'runner'

interface NativeSocketIdentity {
  version: 1
  id: string
  generation: number
}

export type NativeSocketAttachment = NativeSocketIdentity &
  (
    | { role: 'device' | 'runner' }
    | {
        role: 'browser'
        presentation: Pick<WorkspaceLinkContext, 'origin' | 'number'>
      }
  )

interface NativeSocketHandler {
  restore(socket: WebSocket, state: NativeSocketAttachment): Promise<boolean>
  message(
    socket: WebSocket,
    state: NativeSocketAttachment,
    value: string | ArrayBuffer,
  ): Promise<void>
  close(socket: WebSocket, state: NativeSocketAttachment): Promise<void>
}

function attachment(value: unknown): NativeSocketAttachment | null {
  if (typeof value !== 'object' || value === null) return null
  if (!('version' in value) || value.version !== 1) return null
  if (
    !('role' in value) ||
    !['device', 'browser', 'runner'].some((role) => role === value.role) ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    value.id.length > 128 ||
    !('generation' in value) ||
    typeof value.generation !== 'number' ||
    !Number.isSafeInteger(value.generation) ||
    value.generation < 1
  )
    return null
  const role = value.role
  if (role !== 'device' && role !== 'browser' && role !== 'runner') return null
  if (role === 'browser') {
    if (!('presentation' in value)) return null
    const presentation = value.presentation
    if (
      typeof presentation !== 'object' ||
      presentation === null ||
      !('origin' in presentation) ||
      typeof presentation.origin !== 'string' ||
      !('number' in presentation) ||
      typeof presentation.number !== 'number'
    )
      return null
    return {
      version: 1,
      role,
      id: value.id,
      generation: value.generation,
      presentation: {
        origin: presentation.origin,
        number: presentation.number,
      },
    }
  }
  return { version: 1, role, id: value.id, generation: value.generation }
}

/** Only accepted or restored sockets can dispatch to a trusted role. */
export class WorkspaceSockets {
  private readonly context: DurableObjectState
  private readonly roles = new Map<NativeSocketRole, NativeSocketHandler>()
  private readonly sockets = new WeakMap<WebSocket, NativeSocketAttachment>()
  private readonly closed = new WeakSet<WebSocket>()

  constructor(context: DurableObjectState) {
    this.context = context
  }

  register(role: NativeSocketRole, handler: NativeSocketHandler): void {
    this.roles.set(role, handler)
  }

  accept(socket: WebSocket, state: NativeSocketAttachment): void {
    const parsed = attachment(state)
    if (!parsed) throw new Error('Invalid native socket identity.')
    socket.serializeAttachment(parsed)
    this.context.acceptWebSocket(socket, [parsed.role])
    this.sockets.set(socket, parsed)
  }

  async restore(): Promise<void> {
    for (const socket of this.context.getWebSockets()) {
      const stored: unknown = socket.deserializeAttachment()
      const state = attachment(stored)
      const handler = state && this.roles.get(state.role)
      if (
        state &&
        handler &&
        socket.readyState === WebSocket.OPEN &&
        (await handler.restore(socket, state))
      )
        this.sockets.set(socket, state)
      else socket.close(1000, 'The connection is no longer available.')
    }
  }

  async message(socket: WebSocket, value: string | ArrayBuffer): Promise<void> {
    const state = this.sockets.get(socket)
    const handler = state && this.roles.get(state.role)
    if (!state || !handler) {
      socket.close(1000, 'The connection is no longer available.')
      return
    }
    await handler.message(socket, state, value)
  }

  async close(socket: WebSocket): Promise<void> {
    if (this.closed.has(socket)) return
    this.closed.add(socket)
    const stored: unknown = socket.deserializeAttachment()
    const state = this.sockets.get(socket) ?? attachment(stored)
    this.sockets.delete(socket)
    if (state) await this.roles.get(state.role)?.close(socket, state)
  }
}
