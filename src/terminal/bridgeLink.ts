import {
  BRIDGE_MAX_PASTE_BYTES,
  bridgeInputMessage,
  clampBridgeSize,
  parseBridgeOutput,
  type BridgeSize,
} from '../shared/terminal-bridge'

/** A message of the terminal bridge, after the nonce check. */
export type BridgeEvent =
  | {
      readonly kind: 'hello'
      readonly nonce: string
      readonly size: BridgeSize
    }
  | { readonly kind: 'size'; readonly size: BridgeSize }
  | { readonly kind: 'mark'; readonly mark: number }

/**
 * Reads the private messages of the terminal bridge, as xterm.js gives them
 * to its OSC handler. The first hello of a connection sets the nonce. Each
 * later message counts only with that nonce, because a program in the shell
 * can write the same OSC.
 */
export class BridgeReader {
  private nonce: string | null = null

  read(text: string): BridgeEvent | null {
    const parsed = parseBridgeOutput(text)
    if (!parsed) return null
    const { nonce, message } = parsed
    if (this.nonce === null) {
      if (message.kind !== 'hello') return null
      this.nonce = nonce
      return { kind: 'hello', nonce, size: clampBridgeSize(message.size) }
    }
    if (nonce !== this.nonce || message.kind === 'hello') return null
    return message.kind === 'size'
      ? { kind: 'size', size: clampBridgeSize(message.size) }
      : message
  }
}

/** A colour as `#rrggbb`, which the bridge accepts, or null. */
export function hexColour(value: string | undefined): string | null {
  if (!value) return null
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase()
  const canvas =
    typeof document === 'undefined' ? null : document.createElement('canvas')
  const context = canvas?.getContext('2d')
  if (!context) return null
  context.fillStyle = '#000000'
  context.fillStyle = value
  const normal = String(context.fillStyle)
  return /^#[0-9a-f]{6}$/i.test(normal) ? normal.toLowerCase() : null
}

/** The message of a mouse report in a binary encoding. */
export function binaryMessage(nonce: string, data: string): string {
  return bridgeInputMessage(nonce, { kind: 'mouse', base64: btoa(data) })
}

/**
 * The message of a paste, with its line ends as line feeds, which tmux turns
 * into the Return of a terminal. Null for a paste that is too long.
 */
export function pasteMessage(nonce: string, text: string): string | null {
  const bytes = new TextEncoder().encode(text.replace(/\r\n?/g, '\n'))
  if (bytes.length === 0 || bytes.length > BRIDGE_MAX_PASTE_BYTES) return null
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 8_192)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8_192))
  return bridgeInputMessage(nonce, { kind: 'paste', base64: btoa(binary) })
}
