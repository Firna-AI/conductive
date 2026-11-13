import { expect, it } from 'vitest'

import { CommandQueue } from './queue'
import { FlowControl } from './flow'
import { parsePaneState, rebuildPane } from './screen'

const bytes = (text: string) => new TextEncoder().encode(text)
const text = (data: Uint8Array) => new TextDecoder().decode(data)

/** pane, window, session, then the numbers in the order of the format. */
const stateLine = (
  alternate: number,
  overrides: Partial<Record<number, number>> = {},
) => {
  const numbers = [
    40,
    3,
    40,
    3,
    5,
    alternate,
    2,
    1,
    1,
    0,
    0,
    0,
    1,
    0,
    2,
    0,
    0,
    0,
    0,
    0,
  ]
  for (const [index, value] of Object.entries(overrides))
    numbers[Number(index)] = value ?? 0
  return `%1 @2 $3 ${numbers.join(' ')}`
}

it('reads the pane state, and refuses an answer of another shape', () => {
  const state = parsePaneState(stateLine(0))
  expect(state).toMatchObject({
    pane: '%1',
    window: '@2',
    session: '$3',
    paneWidth: 40,
    paneHeight: 3,
    historySize: 5,
    alternate: false,
    cursorX: 2,
    cursorY: 1,
  })
  expect(parsePaneState('%1 @2 $3 40')).toBeNull()
  expect(parsePaneState(stateLine(0).replace('%1', 'x'))).toBeNull()
})

it('moves the history above the screen, then draws each row and the cursor', () => {
  const state = parsePaneState(stateLine(0))
  if (!state) throw new Error('No state.')
  const output = text(
    rebuildPane(
      state,
      [bytes('h1'), bytes('h2')],
      [bytes('a'), bytes('b'), bytes('c')],
      null,
    ),
  )
  expect(output).toContain('\x1b[3Jh1\x1b[0m\r\nh2\x1b[0m\r\n\n\n')
  expect(output).toContain(
    '\x1b[1;1Ha\x1b[0m\x1b[2;1Hb\x1b[0m\x1b[3;1Hc\x1b[0m',
  )
  expect(output).not.toContain('\x1b[?1049h')
  expect(output.endsWith('\x1b[r\x1b[2;3H\x1b[?25h')).toBe(true)
})

it('draws a full-screen program on the alternate screen, with its modes', () => {
  const state = parsePaneState(stateLine(1, { 9: 1, 15: 1, 18: 1 }))
  if (!state) throw new Error('No state.')
  const output = text(rebuildPane(state, [], [bytes('shell')], [bytes('vim')]))
  expect(output.indexOf('shell')).toBeLessThan(output.indexOf('\x1b[?1049h'))
  expect(output.indexOf('\x1b[?1049h')).toBeLessThan(output.indexOf('vim'))
  expect(output).toContain('\x1b[?1h')
  expect(output).toContain('\x1b[?1000h\x1b[?1006h')
})

it('ends a command line at its first failed answer', () => {
  const sent: string[] = []
  const done: [boolean, number][] = []
  const queue = new CommandQueue((line) => sent.push(line))
  queue.run(['a', 'b', 'c'], (failed, blocks) =>
    done.push([failed, blocks.length]),
  )
  queue.run(['d'], (failed, blocks) => done.push([failed, blocks.length]))
  queue.block(false, [])
  queue.block(true, [])
  queue.block(false, [])
  expect(sent).toEqual(['a ; b ; c', 'd'])
  expect(done).toEqual([
    [true, 2],
    [false, 1],
  ])
})

it('drops the output while too many marks wait, and catches up when all are acknowledged', () => {
  const events: string[] = []
  const flow = new FlowControl({
    mark: (mark) => events.push(`mark ${mark}`),
    catchUp: () => events.push('catch up'),
  })
  flow.wrote(10_000_000)
  expect(events).toEqual([])
  flow.enable()
  for (let index = 0; index < 16; index += 1) flow.wrote(64 * 1_024)
  expect(events.at(-1)).toBe('mark 16')
  expect(flow.behind).toBe(true)
  flow.wrote(64 * 1_024)
  flow.acknowledge(15)
  expect(flow.behind).toBe(true)
  flow.acknowledge(99)
  expect(events.filter((event) => event.startsWith('mark'))).toHaveLength(16)
  expect(events.at(-1)).toBe('catch up')
  expect(flow.behind).toBe(false)
})
