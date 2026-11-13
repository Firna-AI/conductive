/**
 * Reads the background colour that a captured line leaves on. tmux writes a
 * style code only where the style changes from the cell before, also across
 * a line end. So the rebuild keeps the style through each line break, and it
 * turns only the background off around the break: a line break that scrolls
 * fills the new row with the background that is on.
 */

const escape = 0x1b
const bracket = 0x5b
const sgrFinal = 0x6d

/** The number of parameters that a colour code of this form takes. */
function colourLength(form: string | undefined): number {
  if (form === '5') return 2
  if (form === '2') return 4
  return 0
}

/** The background after the parameters of one SGR code. */
function applySgr(text: string, background: string | null): string | null {
  const params = text === '' ? ['0'] : text.split(';')
  let current = background
  for (let index = 0; index < params.length; index += 1) {
    const param = params[index] ?? ''
    const code = Number.parseInt(param, 10)
    if (param === '' || code === 0 || code === 49) {
      current = null
    } else if ((code >= 40 && code <= 47) || (code >= 100 && code <= 107)) {
      current = `\x1b[${code}m`
    } else if (param.startsWith('48:')) {
      current = `\x1b[${param}m`
    } else if (param === '48') {
      const length = colourLength(params[index + 1])
      const parts = params.slice(index, index + 2 + length)
      if (length > 0) current = `\x1b[${parts.join(';')}m`
      index += 1 + length
    } else if (param === '38' || param === '58') {
      index += 1 + colourLength(params[index + 1])
    }
  }
  return current
}

/**
 * The SGR code that sets the background that is on after the line, or null
 * for the default background. `background` is the one on before the line.
 */
export function backgroundAfter(
  line: Uint8Array,
  background: string | null,
): string | null {
  let current = background
  for (let index = 0; index + 1 < line.length; index += 1) {
    if (line[index] !== escape || line[index + 1] !== bracket) continue
    let end = index + 2
    while (
      end < line.length &&
      ((line[end] ?? 0) < 0x40 || (line[end] ?? 0) > 0x7e)
    )
      end += 1
    if (line[end] === sgrFinal) {
      const text = new TextDecoder().decode(line.subarray(index + 2, end))
      current = applySgr(text, current)
    }
    index = end
  }
  return current
}
