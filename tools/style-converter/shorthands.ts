import { getStylesForProperty } from 'css-to-react-native'

import { splitCss } from './css-text.ts'
import {
  acceptsScalarToken,
  nativeLiteral,
  numericLength,
} from './native-properties.ts'
import { cssPropertyName, nativeKey, sideKeys } from './property-keys.ts'
import type { Reason } from './reasons.ts'
import { isColorKey, type StyleEntry } from './style-values.ts'
import { cssNumber, type ValueSource } from './value-source.ts'

function wordsOf(source: ValueSource): string[] {
  return splitCss(source.text, ' ').filter(Boolean)
}

export function entry(
  key: string,
  text: string,
  source: ValueSource,
): StyleEntry | Reason {
  const styleKey = nativeKey(cssPropertyName(key))
  const token = source.tokens.get(text)
  if (token) return acceptsScalarToken(styleKey) ? [key, token] : 'tokenType'
  for (const marker of source.tokens.keys()) {
    if (text.includes(marker)) return 'parseValue'
  }
  const value = nativeLiteral(styleKey, text)
  if (value !== undefined) return [key, value]
  return isColorKey(key) ? 'colorValue' : 'nativeValue'
}

export function sidesOf(
  key: string,
  source: ValueSource,
): StyleEntry[] | Reason | undefined {
  const keys = sideKeys(key)
  if (!keys) return undefined
  const words = wordsOf(source)
  if (words.length === 0 || words.length > keys.length) return 'parseValue'
  const [top, right = top, bottom = top, left = right] = words
  const values = [top, right, bottom, left]
  const entries: StyleEntry[] = []
  for (const [index, name] of keys.entries()) {
    const part = entry(name, values[index], source)
    if (typeof part === 'string') return part
    entries.push(part)
  }
  return entries
}

export function stroke(
  key: string,
  source: ValueSource,
): StyleEntry[] | Reason {
  const width = `${key}Width`
  const color = `${key}Color`
  const text = source.text.toLowerCase()
  if (text === 'none' || numericLength(text) === 0) return [[width, 0]]

  const words = wordsOf(source)
  const style = words
    .find((word) => /^(solid|dotted|dashed)$/i.test(word))
    ?.toLowerCase()
  if (words.length < 3) return 'shorthandDefault'
  if (!style || words.length !== 3) return 'parseValue'
  const length = words.find((word) => numericLength(word) !== undefined)
  const tint = words.find((word) => word.toLowerCase() === 'transparent')
  if (!length && !tint) return 'parseValue'
  const remaining = words.find(
    (word) => word.toLowerCase() !== style && word !== (length ?? tint),
  )
  if (!remaining) return 'parseValue'
  const thickness = entry(width, length ?? remaining, source)
  if (typeof thickness === 'string') return thickness
  const paint = entry(color, tint ?? remaining, source)
  if (typeof paint === 'string') return paint
  return [thickness, paint, [`${key}Style`, style]]
}

export function overflow(source: ValueSource): StyleEntry[] | Reason {
  const words = wordsOf(source)
  if (words.length === 0 || words.length > 2) return 'nativeValue'
  const [x, y = x] = words
  const horizontal = entry('overflowX', x, source)
  if (typeof horizontal === 'string') return horizontal
  const vertical = entry('overflowY', y, source)
  if (typeof vertical === 'string') return vertical
  return [horizontal, vertical]
}

export function flexFlow(source: ValueSource): StyleEntry[] | Reason {
  const entries: StyleEntry[] = []
  for (const word of wordsOf(source)) {
    const key = /^(row|row-reverse|column|column-reverse)$/i.test(word)
      ? 'flexDirection'
      : 'flexWrap'
    const value = nativeLiteral(key, word)
    if (value === undefined || entries.some(([existing]) => existing === key))
      return 'nativeValue'
    entries.push([key, value])
  }
  return entries
}

export function flex(source: ValueSource): StyleEntry[] | Reason {
  const words = wordsOf(source)
  const tokenBasis =
    words.length === 3 &&
    words.slice(0, 2).every((word) => cssNumber.test(word))
      ? source.tokens.get(words[2])
      : undefined
  if (source.tokens.size && !tokenBasis) return 'parseValue'
  const value = tokenBasis
    ? `${words[0]} ${words[1]} 1px`
    : source.text.toLowerCase()
  const { flexGrow, flexShrink, flexBasis } = getStylesForProperty(
    'flex',
    value,
    true,
  )
  if (
    typeof flexGrow !== 'number' ||
    !Number.isFinite(flexGrow) ||
    flexGrow < 0 ||
    typeof flexShrink !== 'number' ||
    !Number.isFinite(flexShrink) ||
    flexShrink < 0
  )
    return 'nativeValue'
  // Browsers use a percentage when the shorthand gives no basis.
  const implicitBasis =
    words.every((word) => cssNumber.test(word)) && words.length <= 2
  const basis = implicitBasis ? '0%' : flexBasis
  if (typeof basis === 'number' && (!Number.isFinite(basis) || basis < 0))
    return 'nativeValue'
  if (
    typeof basis === 'string' &&
    nativeLiteral('flexBasis', basis) === undefined
  )
    return 'nativeValue'
  if (typeof basis !== 'number' && typeof basis !== 'string')
    return 'parseValue'
  return [
    ['flexGrow', flexGrow],
    ['flexShrink', flexShrink],
    ['flexBasis', tokenBasis ?? basis],
  ]
}

export function textDecoration(source: ValueSource): StyleEntry[] | Reason {
  const lines: string[] = []
  const entries: StyleEntry[] = []
  for (const word of wordsOf(source)) {
    const literal = word.toLowerCase()
    if (/^(underline|line-through|none)$/.test(literal)) {
      lines.push(literal)
      continue
    }
    const key = /^(solid|double|dotted|dashed)$/.test(literal)
      ? 'textDecorationStyle'
      : 'textDecorationColor'
    const part = entry(key, word, source)
    if (typeof part === 'string') return part
    if (entries.some(([existing]) => existing === key)) return 'parseValue'
    entries.push(part)
  }
  if (lines.length === 0) return 'shorthandDefault'
  const line = nativeLiteral('textDecorationLine', lines.join(' '))
  if (line === undefined) return 'nativeValue'
  return [['textDecorationLine', line], ...entries]
}
