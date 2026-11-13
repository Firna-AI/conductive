import type { BridgeEvent } from './bridgeLink'
import type { TerminalScreen } from './terminalSession'

/** Stands in for xterm.js: records output, and plays input and resizes. */
export class FakeScreen implements TerminalScreen {
  cols = 80
  rows = 24
  modes = { applicationCursorKeysMode: false }
  readonly output: string[] = []
  focusCount = 0
  mouseReleased = false
  private readonly inputListeners = new Set<(data: string) => void>()
  private readonly replyListeners = new Set<(data: string) => void>()
  private readonly focusListeners = new Set<(data: string) => void>()
  private readonly mouseListeners = new Set<
    (data: string, binary: boolean) => void
  >()
  private readonly bridgeListeners = new Set<(event: BridgeEvent) => void>()
  pasteHandler: ((text: string) => boolean) | null = null
  theme: { foreground: string; background: string } | null = {
    foreground: '#eeeeee',
    background: '#111111',
  }
  private readonly resizeListeners = new Set<
    (size: { cols: number; rows: number }) => void
  >()

  get listenerCount(): number {
    return (
      this.inputListeners.size +
      this.replyListeners.size +
      this.focusListeners.size +
      this.mouseListeners.size +
      this.bridgeListeners.size +
      this.resizeListeners.size
    )
  }

  write(data: string): void {
    this.output.push(data)
  }

  onUserInput(listener: (data: string) => void) {
    this.inputListeners.add(listener)
    return { dispose: () => this.inputListeners.delete(listener) }
  }

  onReply(listener: (data: string) => void) {
    this.replyListeners.add(listener)
    return { dispose: () => this.replyListeners.delete(listener) }
  }

  onFocusReport(listener: (data: string) => void) {
    this.focusListeners.add(listener)
    return { dispose: () => this.focusListeners.delete(listener) }
  }

  onMouseReport(listener: (data: string, binary: boolean) => void) {
    this.mouseListeners.add(listener)
    return { dispose: () => this.mouseListeners.delete(listener) }
  }

  resize(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows
  }

  sendMouse(data: string, binary: boolean): void {
    for (const listener of this.mouseListeners) listener(data, binary)
  }

  onBridge(listener: (event: BridgeEvent) => void) {
    this.bridgeListeners.add(listener)
    return { dispose: () => this.bridgeListeners.delete(listener) }
  }

  setPasteHandler(handler: ((text: string) => boolean) | null): void {
    this.pasteHandler = handler
  }

  colours() {
    return this.theme
  }

  onResize(listener: (size: { cols: number; rows: number }) => void) {
    this.resizeListeners.add(listener)
    return { dispose: () => this.resizeListeners.delete(listener) }
  }

  focus(): void {
    this.focusCount += 1
  }

  releaseMouse(): void {
    this.mouseReleased = true
  }

  type(data: string): void {
    for (const listener of this.inputListeners) listener(data)
  }

  reply(data: string): void {
    for (const listener of this.replyListeners) listener(data)
  }

  reportFocus(data: string): void {
    for (const listener of this.focusListeners) listener(data)
  }

  bridge(event: BridgeEvent): void {
    for (const listener of this.bridgeListeners) listener(event)
  }

  resizeTo(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows
    for (const listener of this.resizeListeners) listener({ cols, rows })
  }
}
