// @vitest-environment happy-dom

import type { Terminal } from '@xterm/xterm'
import { expect, it } from 'vitest'
import {
  bridgeInputMessage,
  bridgeOutputMessage,
} from '../shared/terminal-bridge'
import { FakeTerminal } from '../test-support/fake-terminal'
import { hiddenHost } from './hiddenHost.test-support'
import { connectScreen, openScreen } from './screenConnection'

const nonce = '0123456789abcdef0123456789abcdef'

/** Resolves when xterm.js has parsed each chunk that was written before. */
function parsed(xterm: Terminal): Promise<void> {
  return new Promise((resolve) => xterm.write('', resolve))
}

/** A screen of a hidden host, with a connection that counts the inputs. */
function hiddenScreen() {
  const { column, host } = hiddenHost()
  const parts = openScreen(
    host,
    {},
    { links: () => undefined, hintClass: 'hint' },
  )
  const transport = new FakeTerminal()
  const counted = { inputs: 0 }
  const connection = connectScreen(parts, host, transport, {
    onClosed: () => undefined,
    onControlChange: () => undefined,
    onInput: () => counted.inputs++,
  })
  /** Shows the column. Its observers run in the microtask after the change. */
  const show = async () => {
    column.hidden = false
    await Promise.resolve()
  }
  const end = () => {
    connection.dispose()
    parts.dispose()
  }
  return { parts, transport, counted, show, end }
}

it('watches the focus and the paste of a screen that opens after its connection started, so a focus report counts as no input and a paste goes as a paste', async () => {
  const { parts, transport, counted, show, end } = hiddenScreen()
  // The bridge says hello, and a program turns on focus reports.
  const size = { columns: 80, rows: 24 }
  const hello = bridgeOutputMessage(nonce, { kind: 'hello', version: 1, size })
  transport.emit(`${hello}\x1b[?1004h`)
  await parsed(parts.xterm)
  await show()
  const before = transport.inputs.length

  parts.xterm.focus()
  const clipboardData = new DataTransfer()
  clipboardData.setData('text/plain', 'one\ntwo')
  parts.xterm.textarea?.dispatchEvent(
    new ClipboardEvent('paste', {
      clipboardData,
      bubbles: true,
      cancelable: true,
    }),
  )

  expect({ sent: transport.inputs.slice(before), counted }).toEqual({
    sent: [
      bridgeInputMessage(nonce, { kind: 'focus', focused: true }),
      bridgeInputMessage(nonce, { kind: 'paste', base64: btoa('one\ntwo') }),
    ],
    counted: { inputs: 1 },
  })
  end()
})

it('keeps a shared size that came while the screen was hidden, and sends the size of its panel when the screen opens', async () => {
  const { parts, transport, show, end } = hiddenScreen()
  // Another viewer set the shared size before this screen showed.
  const size = { columns: 90, rows: 20 }
  transport.emit(
    bridgeOutputMessage(nonce, { kind: 'hello', version: 1, size }),
  )
  await parsed(parts.xterm)
  const before = transport.sizes.length

  await show()

  expect({
    screen: { cols: parts.xterm.cols, rows: parts.xterm.rows },
    sent: transport.sizes.slice(before),
  }).toEqual({
    screen: { cols: 90, rows: 20 },
    sent: [{ columns: 42, rows: 19 }],
  })
  end()
})
