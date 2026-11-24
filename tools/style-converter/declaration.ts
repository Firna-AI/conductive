import { getPropertyName } from 'css-to-react-native'

import { physicalName } from './css-longhands.ts'
import type { CssDeclaration } from './css-rules.ts'
import { nativeFunction, shadow } from './native-functions.ts'
import { nativeKeys } from './native-properties.ts'
import type { Reason } from './reasons.ts'
import {
  entry,
  flex,
  flexFlow,
  overflow,
  sidesOf,
  stroke,
  textDecoration,
} from './shorthands.ts'
import type { StyleEntry } from './style-values.ts'
import { readValue, stringValue, type ValueSource } from './value-source.ts'

const strokeKeys = new Set([
  'border',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'outline',
])
const extraKeys = new Set([
  ...strokeKeys,
  'background',
  'flexFlow',
  'marginInline',
  'marginBlock',
  'paddingInline',
  'paddingBlock',
  'overflowX',
  'overflowY',
  'textDecoration',
  'textShadow',
])

function expand(key: string, source: ValueSource): StyleEntry[] | Reason {
  if (!source.text) return 'parseValue'
  const sides = sidesOf(key, source)
  if (sides) return sides
  if (strokeKeys.has(key)) return stroke(key, source)
  if (key === 'flex') return flex(source)
  if (key === 'flexFlow') return flexFlow(source)
  if (key === 'overflow') return overflow(source)
  if (key === 'textDecoration') return textDecoration(source)
  if (key === 'boxShadow' || key === 'textShadow') {
    if (key === 'boxShadow' && source.tokens.has(source.text)) {
      return [[key, stringValue(source.text, source)]]
    }
    return shadow(key, source)
  }
  if (key === 'transform' || key === 'transformOrigin' || key === 'filter') {
    if (source.tokens.has(source.text))
      return [[key, stringValue(source.text, source)]]
    return nativeFunction(key, source.text)
  }
  const text =
    key === 'background' && source.text.toLowerCase() === 'none'
      ? 'transparent'
      : source.text
  const result = entry(
    key === 'background' ? 'backgroundColor' : key,
    text,
    source,
  )
  return typeof result === 'string' ? result : [result]
}

type ConvertedDeclaration =
  | { entries: StyleEntry[]; reasons: [] }
  | { entries?: undefined; reasons: Reason[] }

export function convertDeclaration(
  declaration: CssDeclaration,
  tokenValues: ReadonlyMap<string, string>,
  checkCascade = false,
): ConvertedDeclaration {
  const { name, value } = declaration
  const property = physicalName(name)
  const key = getPropertyName(property)
  const source = readValue(property, value)
  const reasons = new Set(source.reasons)
  if (key === 'fontVariant') reasons.add('fontVariant')
  for (const variable of source.variables) {
    const metric = tokenValues.get(variable)
    if (metric === undefined) continue
    for (const reason of readValue(property, metric.trim()).reasons) {
      if (reason === 'em' || reason === 'rem' || reason === 'lineHeight')
        reasons.add(reason)
    }
  }
  if (
    !nativeKeys.has(key) &&
    !extraKeys.has(key) &&
    !reasons.has('grid') &&
    !reasons.has('customProperty')
  ) {
    reasons.add('property')
  }
  const deferSideStyle =
    checkCascade && reasons.size === 1 && reasons.has('sideBorderStyle')
  if (reasons.size && !deferSideStyle) return { reasons: [...reasons] }
  try {
    const entries = expand(key, source)
    return typeof entries === 'string'
      ? { reasons: [...new Set([...reasons, entries])] }
      : { entries, reasons: [] }
  } catch {
    return { reasons: [...reasons, 'parseValue'] }
  }
}
