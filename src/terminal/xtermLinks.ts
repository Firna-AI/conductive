import type { IBufferRange, Terminal } from '@xterm/xterm'
import { WebLinksAddon } from '@xterm/addon-web-links'
import {
  linkHint,
  terminalLink,
  type LinkKey,
  type TerminalLink,
  type TerminalLinks,
} from './terminalLinks'

export interface XtermLinksOptions {
  /** The links of the app now, or undefined when no link opens. */
  links: () => TerminalLinks | undefined
  /** The key that a mouse click holds to open a link. */
  linkKey: LinkKey
  /** The class of the hint below a link. */
  hintClass: string
}

/** The links of a terminal, with the handlers that xterm.js calls. */
export interface XtermLinks {
  /** The pointer is on a link, of the output or with a label. */
  hover: (href: string, range: IBufferRange, labelled: boolean) => void
  leave: () => void
  /** A click or a touch on a link. */
  activate: (event: MouseEvent, href: string) => void
  dispose: () => void
}

/** The space in pixels between a link and its hint. */
const hintGap = 4

/** The host of a real address, for the hint of a link with a label. */
function hostOf(href: string): string {
  return new URL(href).host
}

/**
 * Makes the web addresses of an opened xterm.js terminal open, and the links
 * that a program marks with OSC 8. A mouse click opens a link only with the
 * held key. A touch opens it with no key, because a touch screen has no key
 * to hold. A link under a mouse pointer shows its hint. A click with the key
 * on a link does not reach a program that has the mouse. Call it after
 * `open()`.
 */
export function watchLinks(
  xterm: Terminal,
  options: XtermLinksOptions,
): XtermLinks | null {
  const { element } = xterm
  const screen = element?.querySelector<HTMLElement>('.xterm-screen')
  if (!element || !screen) return null
  let pointer = 'mouse'
  let onLink = false
  const hint = document.createElement('div')
  hint.className = options.hintClass
  hint.hidden = true
  hint.setAttribute('aria-hidden', 'true')
  element.append(hint)

  const read = (href: string): TerminalLink | undefined => {
    const links = options.links()
    return links ? terminalLink(href, links.context) : undefined
  }

  const showHint = (range: IBufferRange, text: string) => {
    const cellWidth = screen.clientWidth / xterm.cols
    const cellHeight = screen.clientHeight / xterm.rows
    // Rows of the range, from 0 at the top of the screen.
    const { viewportY } = xterm.buffer.active
    const firstRow = range.start.y - 1 - viewportY
    const lastRow = range.end.y - 1 - viewportY
    hint.textContent = text
    hint.hidden = false
    const maxLeft = Math.max(0, element.clientWidth - hint.offsetWidth)
    const left = Math.min((range.start.x - 1) * cellWidth, maxLeft)
    // Below the link, or above it when the link is on the last rows.
    const below = (lastRow + 1) * cellHeight + hintGap
    const fits = below + hint.offsetHeight <= screen.clientHeight
    const top = fits
      ? below
      : Math.max(0, firstRow * cellHeight - hint.offsetHeight - hintGap)
    hint.style.left = `${screen.offsetLeft + left}px`
    hint.style.top = `${screen.offsetTop + top}px`
  }

  const hover = (href: string, range: IBufferRange, labelled: boolean) => {
    onLink = read(href) !== undefined
    if (!onLink || pointer === 'touch') return
    const host = labelled ? hostOf(href) : undefined
    showHint(range, linkHint(options.linkKey, host))
  }

  const leave = () => {
    onLink = false
    hint.hidden = true
  }

  const activate = (event: MouseEvent, href: string) => {
    const link = read(href)
    if (!link) return
    if (pointer !== 'touch' && !event[options.linkKey]) return
    options.links()?.open(link)
  }

  const addon = new WebLinksAddon((event, uri) => activate(event, uri), {
    hover: (_event, uri, range) => hover(uri, range, false),
    leave,
  })
  xterm.loadAddon(addon)
  xterm.options.linkHandler = {
    activate: (event, uri) => activate(event, uri),
    hover: (_event, uri, range) => hover(uri, range, true),
    leave,
    allowNonHttpProtocols: false,
  }

  const notePointer = (event: PointerEvent) => {
    pointer = event.pointerType
    if (pointer === 'touch') hint.hidden = true
  }
  // The link part of xterm.js hears the press on the screen first. The
  // parent then sends it to a program that has the mouse, so the press
  // stops here.
  const keepFromProgram = (event: MouseEvent) => {
    if (onLink && pointer !== 'touch' && event[options.linkKey]) {
      event.stopPropagation()
    }
  }
  element.addEventListener('pointerdown', notePointer, true)
  element.addEventListener('pointermove', notePointer, true)
  screen.addEventListener('mousedown', keepFromProgram)

  const dispose = () => {
    element.removeEventListener('pointerdown', notePointer, true)
    element.removeEventListener('pointermove', notePointer, true)
    screen.removeEventListener('mousedown', keepFromProgram)
    xterm.options.linkHandler = null
    addon.dispose()
    hint.remove()
  }
  return { hover, leave, activate, dispose }
}
