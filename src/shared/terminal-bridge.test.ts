import { expect, it } from 'vitest'

import {
  BRIDGE_MESSAGE_END,
  BRIDGE_MESSAGE_START,
  bridgeInputMessage,
  bridgeOutputMessage,
  clampBridgeSize,
  parseBridgeInput,
  parseBridgeOutput,
} from './terminal-bridge'

const nonce = '0123456789abcdef0123456789abcdef'
const body = (message: string) =>
  message.slice(BRIDGE_MESSAGE_START.length, -BRIDGE_MESSAGE_END.length)

it('reads each message that the other side writes', () => {
  for (const message of [
    { kind: 'hello', version: 1, size: { columns: 80, rows: 24 } },
    { kind: 'size', size: { columns: 500, rows: 200 } },
    { kind: 'mark', mark: 7 },
  ] as const)
    expect(
      parseBridgeOutput(body(bridgeOutputMessage(nonce, message))),
    ).toEqual({ nonce, message })
  for (const message of [
    { kind: 'hello', foreground: '#aabbcc', background: '#001122' },
    { kind: 'ack', mark: 3 },
    { kind: 'focus', focused: false },
    { kind: 'paste', base64: 'b25lCnR3bw==' },
  ] as const)
    expect(parseBridgeInput(body(bridgeInputMessage(nonce, message)))).toEqual({
      nonce,
      message,
    })
})

it('refuses a message with a bad nonce, a size over the limit, or a colour that is not one', () => {
  expect(parseBridgeOutput(`ABC;size;80;24`)).toBeNull()
  expect(parseBridgeOutput(`${nonce};size;501;24`)).toBeNull()
  expect(parseBridgeOutput(`${nonce};size;0;24`)).toBeNull()
  expect(parseBridgeOutput(`${nonce};hello;1;80`)).toBeNull()
  expect(parseBridgeInput(`${nonce};hello;red;#000000`)).toBeNull()
  expect(parseBridgeInput(`${nonce};paste;a b`)).toBeNull()
  expect(parseBridgeInput(`${nonce};focus;maybe`)).toBeNull()
})

it('keeps a size inside the limits', () => {
  expect(clampBridgeSize({ columns: 9_000, rows: 0 })).toEqual({
    columns: 500,
    rows: 1,
  })
})
