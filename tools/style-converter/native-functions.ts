import { splitCss } from './css-text.ts'
import { numericLength } from './native-properties.ts'
import type { Reason } from './reasons.ts'
import type { StyleEntry } from './style-values.ts'
import {
  cssNumber,
  readDimension,
  stringValue,
  type ValueSource,
} from './value-source.ts'

function number(text: string) {
  return cssNumber.test(text) && Number.isFinite(Number(text))
}

function percent(text: string) {
  const size = readDimension(text)
  return size?.unit === '%' && Number.isFinite(size.size)
}

function lengthOrPercent(text: string) {
  return numericLength(text) !== undefined || percent(text)
}

function angle(text: string) {
  const size = readDimension(text)
  return Boolean(
    size &&
    (size.unit === 'deg' || size.unit === 'rad') &&
    Number.isFinite(size.size),
  )
}

function transformArgs(name: string, args: string[]) {
  switch (name) {
    case 'matrix':
      return args.length === 6 && args.every(number)
    case 'matrix3d':
      return args.length === 16 && args.every(number)
    case 'perspective':
      return args.length === 1 && (numericLength(args[0]) ?? 0) > 0
    case 'rotate':
    case 'rotatex':
    case 'rotatey':
    case 'rotatez':
    case 'skewx':
    case 'skewy':
      return args.length === 1 && angle(args[0])
    case 'scale':
      return (args.length === 1 || args.length === 2) && args.every(number)
    case 'scalex':
    case 'scaley':
      return args.length === 1 && number(args[0])
    case 'translate':
      return (
        (args.length === 1 || args.length === 2) && args.every(lengthOrPercent)
      )
    case 'translatex':
    case 'translatey':
      return args.length === 1 && lengthOrPercent(args[0])
    default:
      return false
  }
}

function checkFunctions(
  text: string,
  check: (name: string, args: string[]) => boolean,
) {
  const fn = /([a-z][a-z0-9-]*)\(([^()]*)\)/gi
  const matches = [...text.matchAll(fn)]
  return (
    matches.length > 0 &&
    text.replace(fn, '').trim() === '' &&
    matches.every((match) =>
      check(
        match[1].toLowerCase(),
        match[2].split(',').map((arg) => arg.trim()),
      ),
    )
  )
}

function filterArgs(name: string, args: string[]) {
  if (args.length !== 1) return false
  const [value] = args
  if (name === 'hue-rotate') return angle(value)
  if (name === 'blur') return (numericLength(value) ?? -1) >= 0
  return (
    [
      'brightness',
      'contrast',
      'grayscale',
      'invert',
      'opacity',
      'saturate',
      'sepia',
    ].includes(name) &&
    ((number(value) && Number(value) >= 0) ||
      (percent(value) && Number(value.slice(0, -1)) >= 0))
  )
}

function transformOrigin(text: string) {
  const parts = text.split(/\s+/)
  const [x, y, z] = parts
  if (parts.length === 1)
    return /^(left|right|top|bottom|center)$/.test(x) || lengthOrPercent(x)
  return (
    parts.length <= 3 &&
    (/^(left|right|center)$/.test(x) || lengthOrPercent(x)) &&
    (/^(top|bottom|center)$/.test(y) || lengthOrPercent(y)) &&
    (z === undefined || numericLength(z) !== undefined)
  )
}

export function nativeFunction(
  key: string,
  value: string,
): StyleEntry[] | Reason {
  const text = value.toLowerCase()
  if (
    key === 'transform' &&
    (text === 'none' || checkFunctions(text, transformArgs))
  )
    return [[key, text === 'none' ? text : value]]
  if (key === 'filter' && (text === 'none' || checkFunctions(text, filterArgs)))
    return [[key, text]]
  if (key === 'transformOrigin' && transformOrigin(text)) return [[key, text]]
  return 'nativeValue'
}

function shadowParts(part: string, box: boolean, source: ValueSource) {
  const words = splitCss(part.trim(), ' ').filter(Boolean)
  const components = words.filter((word) => word.toLowerCase() !== 'inset')
  if (words.length - components.length > (box ? 1 : 0)) return undefined
  let colorIndex = components.findIndex(
    (word) => word.toLowerCase() === 'transparent',
  )
  const last = components.length - 1
  if (colorIndex === -1 && source.tokens.has(components[last]))
    colorIndex = last
  if (colorIndex === -1 && source.tokens.has(components[0])) colorIndex = 0
  const color = components[colorIndex]
  const offsets = components.filter((_, index) => index !== colorIndex)
  if (offsets.length < 2 || offsets.length > (box ? 4 : 3)) return undefined
  if (colorIndex > 0 && colorIndex < last) return undefined
  const lengths = offsets.map((word) => {
    if (box && source.tokens.has(word)) return source.tokens.get(word)
    return numericLength(word)
  })
  if (lengths.some((length) => length === undefined)) return undefined
  return { lengths, color }
}

export function shadow(
  key: 'boxShadow' | 'textShadow',
  source: ValueSource,
): StyleEntry[] | Reason {
  if (source.text.toLowerCase() === 'none') {
    return key === 'boxShadow'
      ? [[key, 'none']]
      : [['textShadowColor', 'transparent']]
  }
  const parts = splitCss(source.text, ',')
  if (key === 'textShadow' && parts.length !== 1) return 'nativeValue'
  for (const part of parts) {
    const parsed = shadowParts(part, key === 'boxShadow', source)
    if (!parsed) return 'parseValue'
    const { lengths, color } = parsed
    const [width, height, blur] = lengths
    if (typeof blur === 'number' && blur < 0) return 'nativeValue'
    if (!color) return 'shorthandDefault'
    if (key === 'textShadow') {
      if (
        typeof width !== 'number' ||
        typeof height !== 'number' ||
        (blur !== undefined && typeof blur !== 'number')
      ) {
        return 'parseValue'
      }
      return [
        ['textShadowOffset', { kind: 'offset', width, height }],
        ['textShadowRadius', blur ?? 0],
        ['textShadowColor', source.tokens.get(color) ?? 'transparent'],
      ]
    }
  }
  return [[key, stringValue(source.text, source)]]
}
