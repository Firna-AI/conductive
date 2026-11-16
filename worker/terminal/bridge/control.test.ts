import { expect, it } from 'vitest'

import { ControlReader, decodeOutput, type ControlEvent } from './control'

const bytes = (text: string) => new TextEncoder().encode(text)
const text = (data: Uint8Array) => new TextDecoder().decode(data)

function read(...chunks: string[]): ControlEvent[] {
  const events: ControlEvent[] = []
  const reader = new ControlReader((event) => events.push(event))
  for (const chunk of chunks) reader.feed(bytes(chunk))
  return events
}

it('decodes the octal escapes of output, and keeps other bytes', () => {
  expect(text(decodeOutput(bytes('a\\015\\012\\134b\\033[1m')))).toBe(
    'a\r\n\\b\x1b[1m',
  )
  expect(text(decodeOutput(bytes('end\\01')))).toBe('end\\01')
})

it('reads output and extended output of a pane, also across chunks', () => {
  const events = read(
    '%output %3 one\\015',
    '\\012\n%extended-output %3 12 : two\n',
  )
  expect(
    events.map(
      (event) => event.kind === 'output' && [event.pane, text(event.data)],
    ),
  ).toEqual([
    ['%3', 'one\r\n'],
    ['%3', 'two'],
  ])
})

it('ends a block only at the end line that matches its begin line', () => {
  const events = read(
    '%begin 100 7 1\n',
    '%end 100 6 1\n%exit\nline\n',
    '%error 100 7 1\n%layout-change @1 abc\n',
  )
  expect(events[0]).toEqual({
    kind: 'block',
    flags: 1,
    failed: true,
    lines: [bytes('%end 100 6 1'), bytes('%exit'), bytes('line')],
  })
  expect(events[1]).toEqual({
    kind: 'notification',
    name: 'layout-change',
    args: ['@1', 'abc'],
  })
})
