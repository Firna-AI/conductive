import { expect, it } from 'vitest'

import { CommandQueue } from './queue'
import { FlowControl } from './flow'
import {
  PANE_STATE_FORMAT,
  parsePaneState,
  rebuildPane,
  type PaneState,
} from './screen'

const bytes = (text: string) => new TextEncoder().encode(text)
const text = (data: Uint8Array) => new TextDecoder().decode(data)

const fieldNames = [...PANE_STATE_FORMAT.matchAll(/#\{(\w+)\}/g)].map(
  (match) => match[1] ?? '',
)

/** Values of the state format by name. A name outside the format fails the type check. */
type StateValues = Partial<Record<keyof PaneState['flags'], number | string>>

/** The answer of the state format, with each value set by its name. */
function stateLine(values: StateValues = {}): string {
  const base: StateValues = {
    pane_id: '%1',
    window_id: '@2',
    session_id: '$3',
    pane_width: 40,
    pane_height: 3,
    window_width: 40,
    window_height: 3,
    history_size: 5,
    cursor_x: 2,
    cursor_y: 1,
    alternate_saved_x: 4_294_967_295,
    alternate_saved_y: 4_294_967_295,
    cursor_flag: 1,
    wrap_flag: 1,
    scroll_region_lower: 2,
  }
  return fieldNames
    .map((name) => {
      const key = name as keyof StateValues
      return values[key] ?? base[key] ?? 0
    })
    .join(' ')
}

function rebuilt(
  values: StateValues,
  lines: Partial<Record<'whole' | 'history' | 'screen' | 'normal', string[]>>,
) {
  const state = parsePaneState(stateLine(values))
  if (!state) throw new Error('No state.')
  const capture = (name: keyof typeof lines) => (lines[name] ?? []).map(bytes)
  return text(
    rebuildPane(state, {
      whole: capture('whole'),
      history: capture('history'),
      screen: capture('screen'),
      normal: capture('normal'),
    }),
  )
}

it('reads the pane state, and refuses an answer of another shape', () => {
  expect(parsePaneState(stateLine())).toMatchObject({
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
  expect(parsePaneState(stateLine({ pane_id: 'x' }))).toBeNull()
})

it('prints the history and the screen as one flow, with wrap on and ASCII selected first', () => {
  const output = rebuilt({}, { whole: ['h1', 'a long line', 'b', ''] })
  const start = output.indexOf('\x1b[?7h\x1b(B\x1b)0\x0f')
  expect(start).toBeGreaterThan(-1)
  expect(start).toBeLessThan(output.indexOf('h1'))
  expect(output).toContain('h1\r\na long line\r\nb\r\n\x1b[0m\x0f')
  expect(output).not.toContain('\x1b[?1049h')
  expect(output.endsWith('\x1b[r\x1b[2;3H\x1b[?25h')).toBe(true)
})

it('prints a full-screen program on the alternate screen, after the saved cursor, with its modes', () => {
  const output = rebuilt(
    {
      alternate_on: 1,
      alternate_saved_x: 4,
      alternate_saved_y: 2,
      keypad_cursor_flag: 1,
      mouse_standard_flag: 1,
      mouse_button_flag: 0,
      mouse_sgr_flag: 1,
    },
    { whole: ['wrong'], history: ['h1'], normal: ['shell'], screen: ['vim'] },
  )
  expect(output).not.toContain('wrong')
  expect(output.indexOf('h1')).toBeLessThan(output.indexOf('shell'))
  expect(output.indexOf('shell')).toBeLessThan(
    output.indexOf('\x1b[3;5H\x1b[?1049h'),
  )
  expect(output.indexOf('\x1b[?1049h')).toBeLessThan(output.indexOf('vim'))
  expect(output).toContain('\x1b[?1h')
  expect(output).toContain('\x1b[?1000h\x1b[?1006h')
  expect(output).not.toContain('\x1b[?1003h')
})

it('keeps the cursor for a saved position that tmux never set, and leaves out the history of an empty pane', () => {
  const output = rebuilt(
    { alternate_on: 1, history_size: 0 },
    { history: ['first row'], normal: ['shell'], screen: ['vim'] },
  )
  expect(output).not.toContain('first row')
  expect(output).toContain('shell\x1b[0m\x0f\x1b[?1049h')
})

it('restores origin mode, with the cursor row inside the scroll region, and a cursor that waits to wrap', () => {
  const output = rebuilt(
    { origin_flag: 1, scroll_region_upper: 1, cursor_y: 2, cursor_x: 40 },
    { whole: [] },
  )
  expect(output.endsWith('\x1b[2;3r\x1b[?6h\x1b[2;40H\x1b[?25h')).toBe(true)
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

it('keeps a style that tmux carries across a line break, and turns the background off around each break', () => {
  const output = rebuilt(
    { alternate_on: 1 },
    {
      history: ['\x1b[31mred1', 'red2'],
      normal: ['\x1b[44mblue1', 'blue2\x1b[49m', 'plain', '\x1b[48;5;21mbar'],
      screen: ['\x0eqqq', 'xx\x0f'],
    },
  )
  // The red run reaches red2, and the history capture ends with a reset.
  expect(output).toContain('\x1b[31mred1\r\nred2\x1b[0m\x0f\r\n')
  // Each capture starts from the default style.
  expect(output).toContain(
    '\x1b[44mblue1\x1b[49m\r\n\x1b[44mblue2\x1b[49m\r\nplain\r\n\x1b[48;5;21mbar\x1b[0m\x0f',
  )
  // A line-drawing run stays on through the break.
  expect(output).toContain('\x0eqqq\r\nxx\x0f\x1b[0m\x0f')
})

it.each([
  ['mouse_standard_flag', 1000],
  ['mouse_button_flag', 1002],
  ['mouse_all_flag', 1003],
  ['mouse_utf8_flag', 1005],
  ['mouse_sgr_flag', 1006],
] as const)('restores the mouse mode of %s alone', (flag, mode) => {
  const output = rebuilt({ [flag]: 1 }, { whole: [] })
  const set = [...output.matchAll(/\[\?(1000|1002|1003|1005|1006)h/g)].map(
    (match) => Number(match[1]),
  )
  expect(set).toEqual([mode])
})
