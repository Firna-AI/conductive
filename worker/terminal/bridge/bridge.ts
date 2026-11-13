import {
  BRIDGE_MAX_PASTE_BYTES,
  BRIDGE_VERSION,
  bridgeOutputMessage,
  clampBridgeSize,
  parseBridgeInput,
  type BridgeInputMessage,
  type BridgeSize,
} from '../../../src/shared/terminal-bridge.ts'
import {
  keyCommands,
  pasteCommands,
  resizeCommand,
  stateCommand,
  styleCommand,
} from './commands.ts'
import { ControlReader, type ControlEvent } from './control.ts'
import { FlowControl } from './flow.ts'
import { InputSplitter } from './input.ts'
import type { DeviceLink, TmuxLink } from './links.ts'
import { EXIT_BEFORE_HELLO } from './links.ts'
import { parsePaneState, type PaneState } from './screen.ts'
import { CommandQueue } from './queue.ts'
import { Sync } from './sync.ts'

const encoder = new TextEncoder()

/**
 * Joins one connection to a tmux session in control mode. It passes the
 * output of the active pane, sends keys and pastes to that pane, keeps the
 * shared size, and rebuilds the screen at the start and after each change
 * of the pane.
 */
export class Bridge {
  private readonly tmux: TmuxLink
  private readonly device: DeviceLink
  private readonly nonce: string
  private readonly reader: ControlReader
  private readonly queue: CommandQueue
  private readonly splitter = new InputSplitter()
  private readonly sync: Sync
  private readonly flow: FlowControl
  private attached = false
  private state: PaneState | null = null
  private sentSize: BridgeSize | null = null
  /** The size of the last resize that this bridge asked for. */
  private requested: BridgeSize | null = null
  private pastes = 0
  private cancelFlush: (() => void) | null = null
  private waitingKeys: Uint8Array[] = []

  constructor(tmux: TmuxLink, device: DeviceLink, nonce: string) {
    this.tmux = tmux
    this.device = device
    this.nonce = nonce
    this.queue = new CommandQueue((line) => tmux.send(line))
    this.reader = new ControlReader((event) => this.control(event))
    this.flow = new FlowControl({
      mark: (mark) =>
        device.write(bridgeOutputMessage(nonce, { kind: 'mark', mark })),
      catchUp: () => this.sync.start(),
    })
    this.sync = new Sync(this.queue, {
      rebuilt: (state, bytes) => this.rebuilt(state, bytes),
      failed: () => this.device.exit(1),
    })
  }

  /** Reads a chunk of the output of the tmux client. */
  controlOutput(chunk: Uint8Array): void {
    this.reader.feed(chunk)
  }

  /** Reads a chunk of the input of the terminal device. */
  input(chunk: Uint8Array): void {
    this.cancelFlush?.()
    this.cancelFlush = null
    for (const part of this.splitter.split(chunk)) {
      if (part.kind === 'keys') this.keys(part.bytes)
      else this.message(part.text)
    }
    if (this.splitter.holding) {
      this.cancelFlush = this.device.schedule(() => {
        this.cancelFlush = null
        const held = this.splitter.flush()
        if (held.length > 0) this.keys(held)
      }, 10)
    }
  }

  /** The terminal device has a new size. */
  resized(): void {
    if (this.attached) this.takeSize(true)
  }

  /** The tmux client exited. */
  tmuxExited(): void {
    this.device.exit(this.attached ? 0 : EXIT_BEFORE_HELLO)
  }

  /** The connection closed. */
  inputEnded(): void {
    this.tmux.close()
    this.device.exit(0)
  }

  private control(event: ControlEvent): void {
    if (event.kind === 'block') {
      if (event.flags === 1) this.queue.block(event.failed, event.lines)
      else if (!this.attached) this.attach()
      return
    }
    if (event.kind === 'output') {
      if (
        !this.sync.running &&
        !this.flow.behind &&
        event.pane === this.state?.pane
      )
        this.write(event.data)
      return
    }
    this.notification(event.name, event.args)
  }

  private attach(): void {
    this.attached = true
    this.takeSize(true)
    this.sync.start()
  }

  private notification(name: string, args: readonly string[]): void {
    const state = this.state
    if (name === 'exit') this.device.exit(0)
    if (!state) return
    if (name === 'layout-change' && args[0] === state.window) {
      this.queue.run([stateCommand], (failed, blocks) => {
        const next = failed ? null : parsePaneState(text(blocks[0]?.[0]))
        if (next) this.sized(next)
      })
    } else if (
      (name === 'session-window-changed' && args[0] === state.session) ||
      (name === 'window-pane-changed' && args[0] === state.window) ||
      name === 'session-changed'
    ) {
      this.sync.start()
    }
  }

  private rebuilt(state: PaneState, bytes: Uint8Array): void {
    const first = this.state === null
    this.state = state
    const size = paneSize(state)
    if (first) {
      this.write(
        bridgeOutputMessage(this.nonce, {
          kind: 'hello',
          version: BRIDGE_VERSION,
          size,
        }),
      )
      this.sentSize = size
    } else {
      this.sized(state)
    }
    this.write(bytes)
    for (const keys of this.waitingKeys.splice(0)) this.keys(keys)
  }

  /** Keeps the size inside the limits, and tells the screen each change. */
  private sized(state: PaneState): void {
    if (this.state) this.state = { ...this.state, ...sizeFields(state) }
    // Another viewer took the size, so the next key takes it back.
    if (
      this.requested?.columns !== state.windowWidth ||
      this.requested.rows !== state.windowHeight
    )
      this.requested = null
    const limit = clampBridgeSize({
      columns: state.windowWidth,
      rows: state.windowHeight,
    })
    if (
      limit.columns !== state.windowWidth ||
      limit.rows !== state.windowHeight
    )
      this.takeSize(true)
    const size = paneSize(state)
    if (
      size.columns === this.sentSize?.columns &&
      size.rows === this.sentSize.rows
    )
      return
    this.sentSize = size
    this.write(bridgeOutputMessage(this.nonce, { kind: 'size', size }))
  }

  /** Gives the window the size of this device, when it differs. */
  private takeSize(always: boolean): void {
    const own = clampBridgeSize(this.device.size())
    const state = this.state
    const same = (size: BridgeSize | null) =>
      size?.columns === own.columns && size.rows === own.rows
    const current = state
      ? { columns: state.windowWidth, rows: state.windowHeight }
      : null
    if (!always && (same(current) || same(this.requested))) return
    this.requested = own
    this.queue.run([resizeCommand(own.columns, own.rows)], () => {})
  }

  private keys(bytes: Uint8Array): void {
    const state = this.state
    if (!state) {
      this.waitingKeys.push(bytes)
      return
    }
    this.takeSize(false)
    for (const command of keyCommands(state.pane, bytes))
      this.queue.run([command], () => {})
  }

  private message(text: string): void {
    const parsed = parseBridgeInput(text)
    if (!parsed || parsed.nonce !== this.nonce) return
    this.screenMessage(parsed.message)
  }

  private screenMessage(message: BridgeInputMessage): void {
    const state = this.state
    switch (message.kind) {
      case 'hello':
        this.flow.enable()
        this.queue.run(
          [styleCommand(message.foreground, message.background)],
          () => {},
        )
        return
      case 'ack':
        this.flow.acknowledge(message.mark)
        return
      case 'focus':
        if (state)
          this.queue.run(
            keyCommands(
              state.pane,
              encoder.encode(message.focused ? '\x1b[I' : '\x1b[O'),
            ),
            () => {},
          )
        return
      case 'paste':
        this.paste(message.base64)
    }
  }

  private paste(base64: string): void {
    const state = this.state
    if (!state) return
    let bytes: Uint8Array
    try {
      bytes = Uint8Array.from(atob(base64), (character) =>
        character.charCodeAt(0),
      )
    } catch {
      return
    }
    if (bytes.length === 0 || bytes.length > BRIDGE_MAX_PASTE_BYTES) return
    this.takeSize(false)
    const path = this.device.writePaste(bytes)
    this.pastes += 1
    const buffer = `conductive-paste-${this.nonce}-${this.pastes}`
    this.queue.run(pasteCommands(state.pane, buffer, path), () =>
      this.device.removePaste(path),
    )
  }

  /** Writes to the device, and counts the bytes for the flow control. */
  private write(data: Uint8Array | string): void {
    this.device.write(data)
    this.flow.wrote(data.length)
  }
}

function text(line: Uint8Array | undefined): string {
  return line ? new TextDecoder().decode(line) : ''
}

function paneSize(state: PaneState): BridgeSize {
  return clampBridgeSize({ columns: state.paneWidth, rows: state.paneHeight })
}

function sizeFields(state: PaneState) {
  const { paneWidth, paneHeight, windowWidth, windowHeight } = state
  return { paneWidth, paneHeight, windowWidth, windowHeight }
}
