import type { WorkspaceChat } from '../chat/backend'
import { HttpError } from '../http'
import { TerminalSocketLease, terminalNotFound } from './socket-lease'

type TerminalChat = Pick<
  WorkspaceChat,
  'readWorkspace' | 'changeWorkspace' | 'authorizedWorkspaceOperation'
>

export class WorkspaceTerminals {
  private readonly closing = new Set<string>()
  private readonly sockets = new Map<string, Set<TerminalSocketLease>>()
  private readonly chat: TerminalChat

  constructor(chat: TerminalChat) {
    this.chat = chat
  }

  isClosing(terminalId: string): boolean {
    return this.closing.has(terminalId)
  }

  list(orgId: string, workspaceId: string) {
    return this.chat.readWorkspace(workspaceId, async (view) => ({
      terminals: await view.terminals.list(orgId, workspaceId),
      eventNumber: view.eventNumber,
    }))
  }

  refreshSupport(
    orgId: string,
    workspaceId: string,
    several: boolean,
    refresh: () => Promise<boolean>,
  ) {
    return this.chat.changeWorkspace(workspaceId, async (transaction) => {
      if (await refresh())
        await transaction.terminals.supportChanged(orgId, workspaceId, several)
    })
  }

  openSocket(orgId: string, workspaceId: string, terminalId?: string) {
    return this.chat.readWorkspace(workspaceId, async (view) => {
      const terminals = await view.terminals.list(orgId, workspaceId)
      const terminal =
        terminalId === undefined
          ? terminals[0]
          : terminals.find((entry) => entry.id === terminalId)
      if (!terminal || this.isClosing(terminal.id)) throw terminalNotFound()
      const sockets = this.sockets.get(terminal.id) ?? new Set()
      const lease = new TerminalSocketLease(terminal.id, () => {
        sockets.delete(lease)
        if (!sockets.size) this.sockets.delete(terminal.id)
      })
      sockets.add(lease)
      this.sockets.set(terminal.id, sockets)
      return lease
    })
  }

  create(orgId: string, workspaceId: string, authorize: () => Promise<void>) {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    const id = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
    return this.chat.authorizedWorkspaceOperation(
      workspaceId,
      authorize,
      (operation) =>
        operation.change(async (transaction) => ({
          ...(await transaction.terminals.create(orgId, workspaceId, id)),
          eventNumber: transaction.eventNumber,
        })),
    )
  }

  async close(
    orgId: string,
    workspaceId: string,
    terminalId: string,
    authorize: () => Promise<void>,
    endShell: () => Promise<void>,
  ) {
    let marked = false
    try {
      await this.chat.readWorkspace(workspaceId, async (view) => {
        await authorize()
        const terminals = await view.terminals.list(orgId, workspaceId)
        if (!terminals.some((entry) => entry.id === terminalId))
          throw new HttpError(
            404,
            'terminal_not_found',
            'This terminal is no longer available. Open another terminal.',
          )
        if (this.isClosing(terminalId))
          throw new HttpError(
            409,
            'terminal_closing',
            'This terminal is closing. Open another terminal.',
          )
        if (terminals.filter((entry) => !this.isClosing(entry.id)).length <= 1)
          throw new HttpError(
            409,
            'terminal_last',
            'Keep at least one terminal open.',
          )
        this.closing.add(terminalId)
        marked = true
        for (const socket of this.sockets.get(terminalId) ?? []) socket.cancel()
      })
      await authorize()
      await endShell()
      return await this.chat.authorizedWorkspaceOperation(
        workspaceId,
        authorize,
        (operation) =>
          operation.change(async (transaction) => ({
            ...(await transaction.terminals.remove(
              orgId,
              workspaceId,
              terminalId,
            )),
            eventNumber: transaction.eventNumber,
          })),
      )
    } finally {
      if (marked) this.closing.delete(terminalId)
    }
  }
}
