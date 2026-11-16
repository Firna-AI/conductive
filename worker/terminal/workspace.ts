import type { WorkspaceChat } from '../chat/backend'
import { HttpError } from '../http'

type TerminalChat = Pick<
  WorkspaceChat,
  'readWorkspace' | 'authorizedWorkspaceOperation'
>

export class WorkspaceTerminals {
  private readonly closing = new Set<string>()
  private readonly chat: TerminalChat

  constructor(chat: TerminalChat) {
    this.chat = chat
  }

  isClosing(terminalId: string): boolean {
    return this.closing.has(terminalId)
  }

  list(orgId: string, workspaceId: string) {
    return this.chat.readWorkspace(workspaceId, (view) =>
      view.terminals.list(orgId, workspaceId),
    )
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
        operation.change((transaction) =>
          transaction.terminals.create(orgId, workspaceId, id),
        ),
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
      })
      await authorize()
      await endShell()
      return await this.chat.authorizedWorkspaceOperation(
        workspaceId,
        authorize,
        (operation) =>
          operation.change((transaction) =>
            transaction.terminals.remove(orgId, workspaceId, terminalId),
          ),
      )
    } finally {
      if (marked) this.closing.delete(terminalId)
    }
  }
}
