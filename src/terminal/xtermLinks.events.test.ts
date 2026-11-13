// @vitest-environment happy-dom
import { Terminal } from '@xterm/xterm'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { TerminalLink } from './terminalLinks'
import { watchLinks } from './xtermLinks'

/** The size of a cell of the fixed layout, in pixels. */
const cell = { width: 10, height: 20 }

/**
 * happy-dom lays out nothing, so xterm.js would measure no cell. Each
 * element then measures as 80 cells wide and one row high, and the
 * measure element of xterm.js, with its 32 letters, as 32 cells.
 */
const measured = {
  offsetWidth(this: HTMLElement) {
    return this.classList.contains('xterm-char-measure-element')
      ? 32 * cell.width
      : 80 * cell.width
  },
  offsetHeight() {
    return cell.height
  },
}

const saved = (['offsetWidth', 'offsetHeight'] as const).map((name) => ({
  name,
  descriptor: Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
}))

beforeAll(() => {
  for (const { name } of saved) {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      get: measured[name],
    })
  }
})

afterAll(() => {
  for (const { name, descriptor } of saved) {
    if (descriptor)
      Object.defineProperty(HTMLElement.prototype, name, descriptor)
  }
})

let cleanup: (() => void) | undefined

afterEach(() => {
  cleanup?.()
  cleanup = undefined
})

/**
 * A terminal that shows `output`, with the links of the app, the links
 * that it opened, and the data that it sent to the program.
 */
async function showing(output: string) {
  const host = document.createElement('div')
  document.body.append(host)
  const xterm = new Terminal({ cols: 80, rows: 24 })
  xterm.open(host)
  const opened: TerminalLink[] = []
  const links = watchLinks(xterm, {
    links: () => ({
      context: {
        appOrigin: 'https://app.conductive.test',
        isAppPage: () => true,
      },
      open: (link) => opened.push(link),
    }),
    linkKey: 'metaKey',
    hintClass: 'hint',
  })
  const sent: string[] = []
  xterm.onData((data) => sent.push(data))
  await new Promise<void>((resolve) => xterm.write(output, resolve))
  const element = xterm.element as HTMLElement
  // xterm.js reads the padding of its screen, which no style sheet sets here.
  const screen = element.querySelector<HTMLElement>('.xterm-screen')
  if (!screen) throw new Error('xterm.js drew no screen.')
  screen.style.padding = '0px'
  const hint = () => element.querySelector<HTMLElement>('.hint')
  cleanup = () => {
    links?.dispose()
    xterm.dispose()
    host.remove()
  }
  /** A mouse event at the middle of a cell, from 1 at the top left. */
  const mouse = (
    type: string,
    column: number,
    row: number,
    init: MouseEventInit = {},
  ) =>
    screen.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        clientX: (column - 0.5) * cell.width,
        clientY: (row - 0.5) * cell.height,
        ...init,
      }),
    )
  const click = (column: number, row: number, init: MouseEventInit = {}) => {
    mouse('mousedown', column, row, init)
    mouse('mouseup', column, row, init)
  }
  return { opened, sent, hint, mouse, click }
}

describe('terminal links through the events of xterm.js', () => {
  it('opens an address of the output on a click with the key, and shows its hint', async () => {
    const { opened, hint, mouse, click } = await showing(
      '  - Local:   http://localhost:3000/\r\n',
    )
    mouse('mousemove', 20, 1)
    expect(hint()?.hidden).toBe(false)
    expect(hint()?.textContent).toBe('⌘-click to open')
    click(20, 1)
    expect(opened).toEqual([])
    click(20, 1, { metaKey: true })
    expect(opened).toEqual([{ kind: 'local', port: 3000 }])
  })

  it('opens an OSC 8 link and names its real host in the hint', async () => {
    const { opened, hint, mouse, click } = await showing(
      'Report \x1b]8;;https://reports.example.dev/run/1\x07Open the report\x1b]8;;\x07\r\n',
    )
    mouse('mousemove', 10, 1)
    expect(hint()?.textContent).toBe('⌘-click to open reports.example.dev')
    click(10, 1)
    expect(opened).toEqual([])
    click(10, 1, { metaKey: true })
    expect(opened).toEqual([
      { kind: 'web', href: 'https://reports.example.dev/run/1' },
    ])
  })

  it('keeps a click with the key on a link from a program that has the mouse', async () => {
    // Mouse reports with presses, in the SGR encoding, as tmux turns them on.
    const { opened, sent, mouse, click } = await showing(
      '\x1b[?1000h\x1b[?1006hhttp://localhost:3000/\r\n',
    )
    click(30, 3, { metaKey: true })
    // The SGR encoding has no bit for Cmd, so the program sees a press.
    expect(sent).toEqual(['\x1b[<0;30;3M', '\x1b[<0;30;3m'])
    mouse('mousemove', 5, 1)
    click(5, 1, { metaKey: true })
    expect(opened).toEqual([{ kind: 'local', port: 3000 }])
    expect(sent).toHaveLength(2)
  })
})
