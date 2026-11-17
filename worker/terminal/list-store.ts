import {
  FIRST_TERMINAL_ID,
  TERMINAL_LIMIT,
  isTerminalId,
  terminalPaths,
  type TerminalEntry,
} from '../../src/shared/terminal'
import type { WorkspaceEvent } from '../chat/workspace-events'
import type { ChatData } from '../chat/types'
import { HttpError, isRecord } from '../http'

export const TERMINALS_KEY = 'terminals:list'

interface StoredTerminal {
  id: string
  number: number
}

function storedTerminals(value: unknown): StoredTerminal[] {
  if (value === undefined) return [{ id: FIRST_TERMINAL_ID, number: 1 }]
  if (!Array.isArray(value) || !value.length || value.length > TERMINAL_LIMIT)
    throw new Error('Invalid stored terminal list')
  const entries = value.map((entry: unknown) => {
    if (
      !isRecord(entry) ||
      !isTerminalId(entry.id) ||
      typeof entry.number !== 'number' ||
      !Number.isInteger(entry.number) ||
      entry.number < 1 ||
      entry.number > TERMINAL_LIMIT
    )
      throw new Error('Invalid stored terminal entry')
    return { id: entry.id, number: entry.number }
  })
  if (
    new Set(entries.map((entry) => entry.id)).size !== entries.length ||
    new Set(entries.map((entry) => entry.number)).size !== entries.length
  )
    throw new Error('Duplicate stored terminal entry')
  return entries.sort((left, right) => left.number - right.number)
}

/** The caller commits the records and emitted event in one chat transaction. */
export class TerminalList {
  private readonly data: Pick<ChatData, 'get' | 'put'>
  private readonly emit: (event: WorkspaceEvent) => Promise<unknown>

  constructor(
    data: Pick<ChatData, 'get' | 'put'>,
    emit: (event: WorkspaceEvent) => Promise<unknown>,
  ) {
    this.data = data
    this.emit = emit
  }

  async list(orgId: string, workspaceId: string): Promise<TerminalEntry[]> {
    return storedTerminals(await this.data.get<unknown>(TERMINALS_KEY)).map(
      (entry) => ({
        ...entry,
        socketPath: terminalPaths.terminalSocket(orgId, workspaceId, entry.id),
      }),
    )
  }

  async create(orgId: string, workspaceId: string, id: string) {
    const terminals = await this.list(orgId, workspaceId)
    const existing = terminals.find((entry) => entry.id === id)
    if (existing) return { terminal: existing, terminals }
    if (terminals.length === TERMINAL_LIMIT)
      throw new HttpError(
        409,
        'terminal_limit',
        'Close a terminal to open another. A workspace can have up to 10 terminals.',
      )
    let number = 1
    while (terminals.some((entry) => entry.number === number)) number++
    const terminal = {
      id,
      number,
      socketPath: terminalPaths.terminalSocket(orgId, workspaceId, id),
    }
    terminals.push(terminal)
    terminals.sort((left, right) => left.number - right.number)
    await this.save(terminals)
    return { terminal, terminals }
  }

  async remove(orgId: string, workspaceId: string, id: string) {
    const current = await this.list(orgId, workspaceId)
    const terminals = current.filter((entry) => entry.id !== id)
    if (terminals.length !== current.length) await this.save(terminals)
    return { terminals }
  }

  async supportChanged(
    orgId: string,
    workspaceId: string,
    several: boolean,
  ): Promise<void> {
    await this.emit({
      type: 'terminals.updated',
      terminals: await this.list(orgId, workspaceId),
      several,
    })
  }

  private async save(terminals: readonly TerminalEntry[]): Promise<void> {
    await this.data.put(
      TERMINALS_KEY,
      terminals.map(({ id, number }) => ({ id, number })),
    )
    await this.emit({ type: 'terminals.updated', terminals })
  }
}
