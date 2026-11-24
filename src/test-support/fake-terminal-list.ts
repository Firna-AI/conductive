import type { Workspace } from '../shared/generated/Workspace'
import type { TerminalEntry, TerminalResponse } from '../shared/terminal'
import { isTerminalId, TERMINAL_LIMIT, terminalPaths } from '../shared/terminal'
import { RouteError } from '../app/dev/router'
import type { FakeWorkspaceEvents } from './fake-events'
import { FakeTerminal } from './fake-terminal'
import { FAKE_TIME } from './fixtures/core'
import { fakeTerminalEntry, fakeTerminalState } from './fixtures/terminal'

export type FakeTerminalWorkspace = Pick<Workspace, 'id' | 'orgId' | 'state'>

export class FakeTerminalList {
  private terminals: TerminalEntry[]
  private readonly shells = new Map<string, FakeTerminal>()
  private nextId = 0
  private readonly workspace: FakeTerminalWorkspace
  private readonly events: FakeWorkspaceEvents
  private readonly several: boolean

  constructor(
    workspace: FakeTerminalWorkspace,
    events: FakeWorkspaceEvents,
    several: boolean,
  ) {
    this.workspace = workspace
    this.events = events
    this.several = several
    this.terminals = fakeTerminalState(workspace.orgId, workspace.id).terminals
  }

  state(): TerminalResponse {
    const { orgId, id, state } = this.workspace
    const list = {
      terminals: structuredClone(this.terminals),
      several: this.several,
      eventNumber: this.events.last(id),
    }
    if (['ready', 'working', 'unread', 'input'].includes(state))
      return {
        state: 'ready',
        socketPath: terminalPaths.socket(orgId, id),
        protocol: 'tty',
        ...list,
      }
    return {
      state: ['stopped', 'error'].includes(state) ? 'stopped' : 'starting',
      socketPath: null,
      ...list,
    }
  }

  create() {
    this.requireRunning()
    if (!this.several)
      throw new RouteError(
        409,
        'terminals_unavailable',
        'To get terminal tabs after a software update, use Restart or start the cloud computer again.',
      )
    if (this.terminals.length === TERMINAL_LIMIT)
      throw new RouteError(
        409,
        'terminal_limit',
        'Close a terminal to open another. A workspace can have up to 10 terminals.',
      )
    let number = 1
    while (this.terminals.some((terminal) => terminal.number === number))
      number++
    const id = (++this.nextId).toString(16).padStart(32, '0')
    const terminal = fakeTerminalEntry(
      this.workspace.orgId,
      this.workspace.id,
      id,
      number,
    )
    this.terminals.push(terminal)
    this.terminals.sort((left, right) => left.number - right.number)
    const eventNumber = this.changed()
    return { terminal, terminals: this.terminals, eventNumber }
  }

  close(id: string) {
    this.select(id)
    if (this.terminals.length === 1)
      throw new RouteError(
        409,
        'terminal_last',
        'Keep at least one terminal open.',
      )
    this.shells.get(id)?.close()
    this.shells.delete(id)
    this.terminals = this.terminals.filter((terminal) => terminal.id !== id)
    const eventNumber = this.changed()
    return { terminals: this.terminals, eventNumber }
  }

  connect(id?: string) {
    const entry = this.select(id)
    const terminal = this.shells.get(entry.id) ?? new FakeTerminal()
    this.shells.set(entry.id, terminal)
    return { entry, terminal }
  }

  private select(id?: string): TerminalEntry {
    this.requireRunning()
    const entry =
      id === undefined
        ? this.terminals[0]
        : this.terminals.find(
            (terminal) => isTerminalId(id) && terminal.id === id,
          )
    if (!entry)
      throw new RouteError(
        404,
        'terminal_not_found',
        'This terminal is no longer available. Open another terminal.',
      )
    return entry
  }

  private requireRunning() {
    if (this.state().state !== 'ready')
      throw new RouteError(
        409,
        'sandbox_not_ready',
        'Open the workspace to start its cloud computer.',
      )
  }

  private changed() {
    const eventNumber = this.events.last(this.workspace.id) + 1
    this.events.emit({
      workspaceId: this.workspace.id,
      eventNumber,
      occurredAt: FAKE_TIME,
      event: { type: 'terminals.updated', terminals: this.terminals },
    })
    return eventNumber
  }
}
