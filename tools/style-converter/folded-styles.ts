import { physicalName } from './css-longhands.ts'
import { listed, type Cascade } from './merge.ts'
import { nativeLiteral } from './native-properties.ts'
import { foldedKeys } from './property-keys.ts'
import type { StyleValue } from './style-values.ts'

export function checkFoldedStyles(winners: Cascade): Map<string, StyleValue> {
  const shared = new Map<string, StyleValue>()
  for (const [key, names] of Object.entries(foldedKeys)) {
    const sides = names.flatMap((name) => {
      const declaration = winners.get(name)
      if (!declaration) return []
      const value = declaration.values.get(name)?.[0]?.[1]
      if (key !== 'borderStyle' || value !== undefined)
        return [{ declaration, value }]

      const width = name.replace(/-style$/, '-width')
      const widthOwner = winners.get(width)
      if (
        widthOwner &&
        !listed(widthOwner) &&
        widthOwner.values.get(width)?.[0]?.[1] === 0
      )
        return []

      const literal =
        physicalName(declaration.source.name) === name
          ? nativeLiteral(key, declaration.source.value)
          : undefined
      return [{ declaration, value: literal }]
    })
    if (!sides.some(({ declaration }) => !listed(declaration))) continue

    const value = sides[0]?.value
    const canShare =
      (key === 'borderStyle' && value === 'solid') ||
      names.every((name) => winners.has(name))
    if (
      canShare &&
      value !== undefined &&
      sides.every((side) => side.value === value)
    ) {
      shared.set(key, value)
      continue
    }
    const reason = key === 'borderStyle' ? 'sideBorderStyle' : 'overflowAxes'
    for (const { declaration } of sides) {
      if (!declaration.reasons.includes(reason))
        declaration.reasons.push(reason)
    }
  }
  return shared
}
