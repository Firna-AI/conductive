import type { CssDeclaration } from './css-rules.ts'
import { groups } from './shorthands.ts'
import type { ClassStyles, StyleEntry, StyleValue } from './style-values.ts'
import { isSideBorder } from './value-source.ts'

const resets: Readonly<Record<string, string[]>> = {
  'flex-flow': ['flexDirection', 'flexWrap'],
  'text-decoration': [
    'textDecorationLine',
    'textDecorationStyle',
    'textDecorationColor',
  ],
  border: ['borderStyle', ...groups.borderColor],
  outline: ['outlineStyle', 'outlineColor'],
}

type Source = Pick<CssDeclaration, 'name' | 'line'>
type MergedValue = { value: StyleValue; source: Source }
export type MergedStyle = Map<string, MergedValue | undefined>

export function sideBorderConflict(
  style: MergedStyle,
  name: string,
  entries: StyleEntry[],
): boolean {
  const shared = style.get('borderStyle')?.value
  return (
    (shared === 'dashed' || shared === 'dotted') &&
    isSideBorder(name) &&
    entries.some(([key]) => key.endsWith('Color'))
  )
}

export function merge(
  style: MergedStyle,
  source: Source,
  entries: StyleEntry[],
) {
  const { name } = source
  const reset = Object.hasOwn(resets, name) ? resets[name] : []
  const longhands = entries.flatMap(([key, value]): StyleEntry[] => {
    if (!Object.hasOwn(groups, key)) return [[key, value]]
    return groups[key].map((side) => [side, value])
  })
  for (const key of reset) {
    if (style.has(key) && !longhands.some(([longhand]) => longhand === key))
      style.set(key, undefined)
  }
  for (const [key, value] of longhands) {
    style.set(key, {
      value: key === 'display' && value === 'inline-flex' ? 'flex' : value,
      source,
    })
  }
}

export function removeOverridden(
  style: MergedStyle,
  name: string,
): number | undefined {
  let line: number | undefined
  for (const [key, entry] of style) {
    if (entry?.source.name !== name) continue
    style.set(key, undefined)
    line = Math.max(line ?? 0, entry.source.line)
  }
  return line
}

function equal(left: StyleValue, right: StyleValue) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function collapse(
  key: string,
  parts: string[],
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

export function finishStyle(merged: MergedStyle): {
  style: ClassStyles
  row: boolean
} {
  const style: ClassStyles = new Map()
  for (const [key, entry] of merged) {
    if (entry !== undefined) style.set(key, entry.value)
  }

  const replacements = new Map<string, StyleEntry[]>()
  for (const [key, parts] of Object.entries(groups)) {
    const compact = collapse(key, parts, style)
    if (compact.length === 0) continue
    const inOrder = [...style.keys()].filter((key) => parts.includes(key))
    replacements.set(inOrder[0], compact)
    for (const key of inOrder.slice(1)) replacements.set(key, [])
  }

  const row = style.get('display') === 'flex' && !style.has('flexDirection')
  const result: ClassStyles = new Map()
  for (const [key, value] of style) {
    for (const [name, next] of replacements.get(key) ?? [[key, value]])
      result.set(name, next)
    if (key === 'display' && row) result.set('flexDirection', 'row')
  }
  return { style: result, row }
}
