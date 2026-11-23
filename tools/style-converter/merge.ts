import { getPropertyName } from 'css-to-react-native'

import type { CssDeclaration } from './css-rules.ts'
import { groups, longhandKeys } from './property-keys.ts'
import type { ClassStyles, StyleEntry, StyleValue } from './style-values.ts'
import { isSideBorder } from './value-source.ts'

type MergedValue = { source: CssDeclaration } & (
  { kind: 'converted'; value: StyleValue | undefined } | { kind: 'listed' }
)
export type MergedStyle = Map<string, MergedValue>

type Override = {
  previous: CssDeclaration
  keys: string[]
  keepsOtherValues: boolean
}

export function sideBorderConflict(
  style: MergedStyle,
  name: string,
  entries: StyleEntry[],
): boolean {
  const entry = style.get('borderStyle')
  const shared = entry?.kind === 'converted' ? entry.value : undefined
  return (
    (shared === 'dashed' || shared === 'dotted') &&
    isSideBorder(name) &&
    entries.some(([key]) => key.endsWith('Color'))
  )
}

export function merge(
  style: MergedStyle,
  source: CssDeclaration,
  entries?: StyleEntry[],
): Override[] {
  const values = new Map<string, StyleValue>()
  for (const [key, value] of entries ?? []) {
    const next = key === 'display' && value === 'inline-flex' ? 'flex' : value
    for (const longhand of longhandKeys(key)) values.set(longhand, next)
  }

  const keys = new Set([
    ...values.keys(),
    ...longhandKeys(getPropertyName(source.name)),
  ])
  const overridden = new Map<CssDeclaration, string[]>()
  for (const key of keys) {
    const earlier = style.get(key)
    if (earlier?.source.important && !source.important) continue
    const value = values.get(key)
    if (entries && value === undefined && !earlier && !source.important)
      continue
    if (
      (earlier?.kind === 'listed' && entries) ||
      (earlier?.kind === 'converted' && earlier.value !== undefined && !entries)
    ) {
      const removed = overridden.get(earlier.source) ?? []
      removed.push(key)
      overridden.set(earlier.source, removed)
    }
    style.set(
      key,
      entries
        ? { kind: 'converted', source, value }
        : { kind: 'listed', source },
    )
  }
  return [...overridden].map(([previous, keys]) => ({
    previous,
    keys,
    keepsOtherValues: [...style.values()].some(
      (entry) =>
        entry.source === previous &&
        (entry.kind === 'listed' || entry.value !== undefined),
    ),
  }))
}

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

export function finishStyle(merged: MergedStyle): {
  style: ClassStyles
  row: boolean
} {
  const style: ClassStyles = new Map()
  for (const [key, entry] of merged) {
    if (entry.kind === 'converted' && entry.value !== undefined)
      style.set(key, entry.value)
  }

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
    merged.get('flexDirection')?.kind !== 'listed'
  const result: ClassStyles = new Map()
  for (const [key, value] of style) {
    for (const [name, next] of replacements.get(key) ?? [[key, value]])
      result.set(name, next)
    if (key === 'display' && row) result.set('flexDirection', 'row')
  }
  return { style: result, row }
}
