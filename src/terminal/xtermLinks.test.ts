// @vitest-environment happy-dom
import { Terminal } from '@xterm/xterm'
import { afterEach, describe, expect, it } from 'vitest'
import type { TerminalLink, TerminalLinks } from './terminalLinks'
import { watchLinks, type XtermLinks } from './xtermLinks'

const range = { start: { x: 3, y: 2 }, end: { x: 23, y: 2 } }

let cleanup: (() => void) | undefined

afterEach(() => {
  cleanup?.()
  cleanup = undefined
})

/** An opened terminal with its links, and the links that it opened. */
function openTerminal(withLinks = true) {
  const host = document.createElement('div')
  document.body.append(host)
  const xterm = new Terminal()
  xterm.open(host)
  const opened: TerminalLink[] = []
  const links: TerminalLinks = {
    context: { appOrigin: 'https://conductive.build', isAppPage: () => true },
    open: (link) => opened.push(link),
  }
  const watched = watchLinks(xterm, {
    links: () => (withLinks ? links : undefined),
    linkKey: 'metaKey',
    hintClass: 'hint',
  }) as XtermLinks
  const element = xterm.element as HTMLElement
  const screen = element.querySelector('.xterm-screen') as HTMLElement
  const hint = element.querySelector('.hint') as HTMLElement
  cleanup = () => {
    watched.dispose()
    xterm.dispose()
    host.remove()
  }
  return { xterm, watched, opened, element, screen, hint }
}

function point(target: HTMLElement, pointerType: string) {
  target.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, pointerType }),
  )
}

describe('watchLinks', () => {
  it('opens a link on a click with the key only', () => {
    const { watched, opened } = openTerminal()
    watched.activate(new MouseEvent('mouseup'), 'http://localhost:3000/')
    watched.activate(
      new MouseEvent('mouseup', { ctrlKey: true }),
      'http://localhost:3000/',
    )
    watched.activate(
      new MouseEvent('mouseup', { metaKey: true }),
      'http://localhost:3000/',
    )
    expect(opened).toEqual([{ kind: 'local', port: 3000 }])
  })

  it('opens a link on a touch with no key, and shows no hint', () => {
    const { watched, opened, screen, hint } = openTerminal()
    point(screen, 'touch')
    watched.hover('https://github.com/acme', range, false)
    watched.activate(new MouseEvent('mouseup'), 'https://github.com/acme')
    expect(opened).toEqual([{ kind: 'web', href: 'https://github.com/acme' }])
    expect(hint.hidden).toBe(true)
  })

  it('opens nothing and shows no hint for a refused address', () => {
    const { watched, opened, hint } = openTerminal()
    const refused = 'https://github.com@evil.example/'
    watched.hover(refused, range, false)
    watched.activate(new MouseEvent('mouseup', { metaKey: true }), refused)
    expect(opened).toEqual([])
    expect(hint.hidden).toBe(true)
  })

  it('opens nothing without the links of the app', () => {
    const { watched, opened, hint } = openTerminal(false)
    watched.hover('http://localhost:3000/', range, false)
    watched.activate(
      new MouseEvent('mouseup', { metaKey: true }),
      'http://localhost:3000/',
    )
    expect(opened).toEqual([])
    expect(hint.hidden).toBe(true)
  })

  it('shows the hint under a mouse pointer, with the real host of a link with a label', () => {
    const { watched, hint } = openTerminal()
    watched.hover('http://localhost:3000/', range, false)
    expect(hint.hidden).toBe(false)
    expect(hint.textContent).toBe('⌘-click to open')
    watched.leave()
    expect(hint.hidden).toBe(true)
    watched.hover('https://reports.storefront.dev/run/1', range, true)
    expect(hint.textContent).toBe('⌘-click to open reports.storefront.dev')
  })

  it('keeps a press with the key on a link from the program, and passes every other press', () => {
    const { watched, element, screen } = openTerminal()
    const reached: string[] = []
    // xterm.js sends a press to a program from a listener of its element.
    element.addEventListener('mousedown', (event) =>
      reached.push(event.metaKey ? 'cmd' : 'plain'),
    )
    const press = (metaKey: boolean) =>
      screen.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, metaKey }),
      )
    press(true)
    watched.hover('http://localhost:3000/', range, false)
    press(true)
    press(false)
    watched.leave()
    press(true)
    expect(reached).toEqual(['cmd', 'plain', 'cmd'])
  })

  it('sets the handler of OSC 8 links, and removes it and the hint at the end', () => {
    const { xterm, watched, element } = openTerminal()
    expect(xterm.options.linkHandler?.allowNonHttpProtocols).toBe(false)
    watched.dispose()
    expect(xterm.options.linkHandler).toBeNull()
    expect(element.querySelector('.hint')).toBeNull()
  })
})
