import { expect, it } from 'vitest'

import { bridgeInputMessage } from '../../../src/shared/terminal-bridge'
import { Bridge } from './bridge'

const nonce = '0123456789abcdef0123456789abcdef'
const encoder = new TextEncoder()
/** A pane state answer: the IDs, then the numbers in the order of the format. */
function stateOf(width: number, height: number): string {
  const numbers = [width, height, width, height, 0, 0, 0, 0, 4_294_967_295]
  numbers.push(4_294_967_295, 1, 0, 0, 0, 1, 0, 0, height - 1, 0, 0, 0, 0, 0)
  return `%1 @2 $3 ${numbers.join(' ')}`
}
const state = stateOf(40, 3)

/** A bridge whose tmux answers each command line with empty blocks. */
function fakeBridge() {
  const sent: string[] = []
  const tasks: (() => void)[] = []
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
      schedule: (task) => {
        tasks.push(task)
        return () => tasks.splice(tasks.indexOf(task), 1)
      },
      exit: () => {},
    },
    nonce,
  )
  const control = (text: string) => bridge.controlOutput(encoder.encode(text))
  /** Answers each sent line that has no answer yet. */
  const answer = (paneState = state) => {
    for (; answered < sent.length; answered += 1) {
      for (const command of (sent[answered] ?? '').split(' ; ')) {
        const number = Math.floor(Math.random() * 1e9)
        const lines = command.startsWith('display-message')
          ? `${paneState}\n`
          : ''
        control(`%begin 1 ${number} 1\n${lines}%end 1 ${number} 1\n`)
      }
    }
  }
  return { bridge, sent, written, control, answer, tasks }
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

it('holds the output after a layout change until the screen has the new size', () => {
  const fake = fakeBridge()
  fake.control('%begin 1 1 0\n%end 1 1 0\n')
  fake.answer()
  fake.answer()
  fake.control('%layout-change @2 abcd,80x20,0,0,1 abcd,80x20,0,0,1 *\n')
  fake.control('%output %1 REDRAW\n')
  expect(fake.written.join('')).not.toContain('REDRAW')
  fake.answer(stateOf(80, 20))
  const output = fake.written.join('')
  expect(output.indexOf(`;size;80;20\x07`)).toBeGreaterThan(-1)
  expect(output.indexOf(`;size;80;20\x07`)).toBeLessThan(
    output.indexOf('REDRAW'),
  )
})

it('sends a mouse report of a binary encoding to the pane as keys', () => {
  const fake = fakeBridge()
  fake.control('%begin 1 1 0\n%end 1 1 0\n')
  fake.answer()
  fake.answer()
  const report = btoa('\x1b[M #!')
  fake.bridge.input(
    encoder.encode(
      bridgeInputMessage(nonce, { kind: 'mouse', base64: report }),
    ),
  )
  expect(fake.sent.at(-1)).toBe("send-keys -t '%1' -H 1b 5b 4d 20 23 21")
})

it('sends a lone Escape key on when the flush timer runs, and not before', () => {
  const fake = fakeBridge()
  fake.control('%begin 1 1 0\n%end 1 1 0\n')
  fake.answer()
  fake.answer()
  const before = fake.sent.length
  fake.bridge.input(encoder.encode('\x1b'))
  expect(fake.sent).toHaveLength(before)
  expect(fake.tasks).toHaveLength(1)
  fake.tasks[0]?.()
  expect(fake.sent.at(-1)).toBe("send-keys -t '%1' -H 1b")
})
