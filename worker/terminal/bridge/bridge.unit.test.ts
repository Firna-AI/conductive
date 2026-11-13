import { expect, it } from 'vitest'

import { bridgeInputMessage } from '../../../src/shared/terminal-bridge'
import { Bridge } from './bridge'

const nonce = '0123456789abcdef0123456789abcdef'
const encoder = new TextEncoder()
const state = '%1 @2 $3 40 3 40 3 0 0 0 0 1 0 0 0 1 0 2 0 0 0 0 0'

/** A bridge whose tmux answers each command line with empty blocks. */
function fakeBridge() {
  const sent: string[] = []
  const written: string[] = []
  let answered = 0
  const bridge = new Bridge(
    { send: (line) => sent.push(line), close: () => {} },
    {
      write: (data) =>
        written.push(
          typeof data === 'string' ? data : new TextDecoder().decode(data),
        ),
      size: () => ({ columns: 40, rows: 3 }),
      writePaste: () => '/run/paste',
      removePaste: () => {},
      schedule: () => () => {},
      exit: () => {},
    },
    nonce,
  )
  const control = (text: string) => bridge.controlOutput(encoder.encode(text))
  /** Answers each sent line that has no answer yet. */
  const answer = () => {
    for (; answered < sent.length; answered += 1) {
      for (const command of (sent[answered] ?? '').split(' ; ')) {
        const number = Math.floor(Math.random() * 1e9)
        const lines = command.startsWith('display-message') ? `${state}\n` : ''
        control(`%begin 1 ${number} 1\n${lines}%end 1 ${number} 1\n`)
      }
    }
  }
  return { bridge, sent, written, control, answer }
}

it('rebuilds the pane at the start, then sends the keys that came before', () => {
  const fake = fakeBridge()
  fake.bridge.input(encoder.encode('ls\r'))
  fake.control('%begin 1 1 0\n%end 1 1 0\n')
  fake.answer()
  fake.answer()
  expect(fake.written[0]).toBe(`\x1b]7717;${nonce};hello;1;40;3\x07`)
  expect(fake.sent.at(-1)).toBe("send-keys -t '%1' -H 6c 73 0d")
})

it('takes only messages with the nonce of the connection out of the input', () => {
  const fake = fakeBridge()
  fake.control('%begin 1 1 0\n%end 1 1 0\n')
  fake.answer()
  fake.answer()
  const before = fake.sent.length
  const other = 'fedcba9876543210fedcba9876543210'
  fake.bridge.input(
    encoder.encode(bridgeInputMessage(other, { kind: 'focus', focused: true })),
  )
  expect(fake.sent).toHaveLength(before)
  fake.bridge.input(
    encoder.encode(bridgeInputMessage(nonce, { kind: 'focus', focused: true })),
  )
  expect(fake.sent.at(-1)).toBe("send-keys -t '%1' -H 1b 5b 49")
})
