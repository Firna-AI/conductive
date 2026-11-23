import { getStylesForProperty } from 'css-to-react-native'

import { cssTokens, splitCss } from './css-text.ts'
import type { Reason } from './reasons.ts'
import type { StyleValue, Token } from './style-values.ts'

const cssWide = /^(inherit|initial|unset|revert|revert-layer)$/i
const hexColor = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i
const colorFunction =
  /^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|gray|color|device-cmyk)$/
const colorContext =
  /^(?:[a-z-]*color|background|border(?:-(top|right|bottom|left|inline|block)(?:-(start|end))?)?|outline|box-shadow|text-shadow|text-decoration|mask-image|filter|fill|stroke)$/
const calculation = /^(calc|min|max|clamp)$/
const gridFunction = /^(minmax|repeat)$/
const themeVariable = /^--ui-([a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/

export function isSideBorder(property: string): boolean {
  return /^border-(top|right|bottom|left)$/.test(property)
}

const numberPattern = '[+-]?(?:\\d*\\.\\d+|\\d+)(?:e[+-]?\\d+)?'
export const cssNumber = new RegExp(`^${numberPattern}$`, 'i')
const dimension = new RegExp(`^(${numberPattern})([a-z][\\w-]*|%)$`, 'i')

export function readDimension(value: string) {
  const match = dimension.exec(value)
  if (!match) return undefined
  return { size: Number(match[1]), unit: match[2].toLowerCase() }
}

function camelName(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, next: string) => next.toUpperCase())
}

export type ValueSource = {
  text: string
  tokens: Map<string, Token>
  reasons: Reason[]
}

function isNamedColor(text: string): boolean {
  if (text === 'transparent' || !/^[a-z]+$/.test(text)) return false
  try {
    return (
      getStylesForProperty('background', text, true).backgroundColor === text
    )
  } catch {
    return false
  }
}

const transformFunctions = new Set([
  'matrix',
  'matrix3d',
  'perspective',
  'rotate',
  'rotatex',
  'rotatey',
  'rotatez',
  'scale',
  'scalex',
  'scaley',
  'translate',
  'translatex',
  'translatey',
  'skewx',
  'skewy',
])
const filterFunctions = new Set([
  'blur',
  'brightness',
  'contrast',
  'grayscale',
  'hue-rotate',
  'invert',
  'opacity',
  'saturate',
  'sepia',
])

function functionReason(name: string, property: string): Reason | undefined {
  if (gridFunction.test(name)) return 'grid'
  if (calculation.test(name)) return 'calculation'
  if (colorFunction.test(name)) return 'fixedColor'
  if (property === 'transform' && transformFunctions.has(name)) return undefined
  if (property === 'filter' && filterFunctions.has(name)) return undefined
  return 'cssFunction'
}

function closeParenthesis(parts: ReturnType<typeof cssTokens>, open: number) {
  let depth = 1
  for (let index = open + 1; index < parts.length; index++) {
    if (parts[index].text === '(') depth++
    if (parts[index].text === ')' && --depth === 0) return index
  }
}

export function readValue(property: string, value: string): ValueSource {
  const reasons = new Set<Reason>()
  const tokens = new Map<string, Token>()
  const parts = cssTokens(value)
  let text = ''
  let marker = '__style_token_'
  while (value.includes(marker)) marker = '_' + marker

  if (property.startsWith('--')) reasons.add('customProperty')
  if (
    /^grid(?:-|$)/.test(property) ||
    (property === 'display' && /^(inline-)?grid$/i.test(value))
  ) {
    reasons.add('grid')
  }
  if (cssWide.test(value)) reasons.add('cssKeyword')
  if (property === 'line-height' && cssNumber.test(value))
    reasons.add('lineHeight')

  for (let index = 0; index < parts.length; index++) {
    const { text: part, offset } = parts[index]
    const name = part.toLowerCase()
    const open = parts[index + 1]
    if (/^[a-z][\w-]*$/.test(name) && open?.text === '(') {
      if (name === 'var') {
        const close = closeParenthesis(parts, index + 1)
        const args =
          close === undefined
            ? ''
            : value.slice(open.offset + 1, parts[close].offset)
        const name = splitCss(args, ',')[0].trim()
        const token = themeVariable.exec(name)
        if (token && close !== undefined) {
          const key = `${marker}${tokens.size}__`
          tokens.set(key, { kind: 'token', name: camelName(token[1]) })
          text += key
          index = close
          continue
        }
        reasons.add(
          name.startsWith('--') && !name.startsWith('--ui-')
            ? 'localVariable'
            : 'parseValue',
        )
      } else {
        const reason = functionReason(name, property)
        if (reason) reasons.add(reason)
      }
    } else {
      if (isSideBorder(property) && /^(dashed|dotted)$/.test(name)) {
        reasons.add('sideBorderStyle')
      }
      const unit = readDimension(part)?.unit
      if (unit === 'fr') reasons.add('grid')
      else if (unit === 'em' || unit === 'rem') reasons.add(unit)
      else if (unit && !['px', '%', 'deg', 'rad'].includes(unit))
        reasons.add('unit')
      if (name === 'currentcolor') reasons.add('currentColor')
      if (
        hexColor.test(part) ||
        (colorContext.test(property) && isNamedColor(name))
      )
        reasons.add('fixedColor')
    }
    text += value.slice(offset, offset + part.length)
  }
  return { text, tokens, reasons: [...reasons] }
}

export function stringValue(text: string, source: ValueSource): StyleValue {
  const parts: (string | Token)[] = []
  let start = 0
  for (const part of cssTokens(text)) {
    const token = source.tokens.get(part.text)
    if (!token) continue
    if (part.offset > start) parts.push(text.slice(start, part.offset))
    parts.push(token)
    start = part.offset + part.text.length
  }
  if (parts.length === 0) return text
  if (start < text.length) parts.push(text.slice(start))
  return { kind: 'template', parts }
}
