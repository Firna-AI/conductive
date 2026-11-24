import { groups } from './property-keys.ts'
import type { ClassStyles, StyleEntry, StyleValue } from './style-values.ts'

function equal(left: StyleValue, right: StyleValue) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function collapse(
  key: string,
  parts: readonly string[],
  style: ClassStyles,
): StyleEntry[] {
  const [first, second, third, fourth] = parts.map((part) => style.get(part))
  if (first === undefined || second === undefined) return []
  if (parts.length === 2) return equal(first, second) ? [[key, first]] : []
  if (third === undefined || fourth === undefined) return []
  if (!equal(first, third) || !equal(second, fourth)) return []
  if (equal(first, second)) return [[key, first]]
  if (key !== 'padding' && key !== 'margin') return []
  return [
    [`${key}Vertical`, first],
    [`${key}Horizontal`, second],
  ]
}

export function finishStyle(style: ClassStyles, listedDirection: boolean) {
  const replacements = new Map<string, StyleEntry[]>()
  for (const [key, parts] of Object.entries(groups)) {
    const compact = collapse(key, parts, style)
    if (compact.length === 0) continue
    const inOrder = [...style.keys()].filter((key) => parts.includes(key))
    replacements.set(inOrder[0], compact)
    for (const key of inOrder.slice(1)) replacements.set(key, [])
  }

  const row =
    style.get('display') === 'flex' &&
    !style.has('flexDirection') &&
    !listedDirection
  const result: ClassStyles = new Map()
  for (const [key, value] of style) {
    for (const [name, next] of replacements.get(key) ?? [[key, value]])
      result.set(name, next)
    if (key === 'display' && row) result.set('flexDirection', 'row')
  }
  return { style: result, row }
}
