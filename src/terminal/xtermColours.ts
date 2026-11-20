import type { Terminal } from '@xterm/xterm'

/** The request types of a colour change and a colour reset in xterm.js 6. */
const colourChange = 1
const colourReset = 2

/** Whether a colour request of xterm.js is a change or a reset, not a query. */
function changesColour(request: unknown): boolean {
  if (typeof request !== 'object' || request === null) return false
  const type: unknown = Reflect.get(request, 'type')
  return type === colourChange || type === colourReset
}

/**
 * Keeps the colour changes and resets of output that xterm.js parses before
 * `open()`, in order, and returns the function that applies them. Call that
 * function directly after `open()`. From then on, each colour event goes to
 * xterm.js. A theme-option change discards earlier kept events, as a theme
 * change does after open. A colour query before then gets no answer, because
 * a late answer would reach the program as input.
 *
 * This relies on private parts of xterm.js 6. Its terminal keeps its core in
 * `_core`. The core makes `_themeService` in `open()`, and its
 * `_handleColorEvent` drops each colour event without it. The core looks up
 * that handler for each event, so a handler that this sets on the core gets
 * each event first. Its `optionsService.onSpecificOptionChange` reports each
 * theme change. That subscription stops at the open. An earlier terminal
 * disposal clears the option listeners. Without a required private part, as
 * after an upgrade, the screen still works but loses those colours, and the
 * colour test of `openScreen` fails.
 */
export function keepColoursUntilOpen(xterm: Terminal): () => void {
  const core: unknown = Reflect.get(xterm, '_core')
  if (typeof core !== 'object' || core === null) return () => undefined
  const handle: unknown = Reflect.get(core, '_handleColorEvent')
  if (typeof handle !== 'function') return () => undefined
  const options: unknown = Reflect.get(core, 'optionsService')
  if (typeof options !== 'object' || options === null) return () => undefined
  const watch: unknown = Reflect.get(options, 'onSpecificOptionChange')
  if (typeof watch !== 'function') return () => undefined
  const kept: (readonly unknown[])[] = []
  const subscription: unknown = Reflect.apply(watch, options, [
    'theme',
    () => {
      kept.length = 0
    },
  ])
  if (typeof subscription !== 'object' || subscription === null)
    return () => undefined
  const stop: unknown = Reflect.get(subscription, 'dispose')
  if (typeof stop !== 'function') return () => undefined
  let opened = false
  Reflect.set(core, '_handleColorEvent', (event: unknown) => {
    if (opened || Reflect.get(core, '_themeService')) {
      Reflect.apply(handle, core, [event])
      return
    }
    if (!Array.isArray(event)) return
    const requests: readonly unknown[] = event
    const changes = requests.filter(changesColour)
    if (changes.length > 0) kept.push(changes)
  })
  return () => {
    opened = true
    Reflect.apply(stop, subscription, [])
    for (const event of kept.splice(0)) Reflect.apply(handle, core, [event])
  }
}
