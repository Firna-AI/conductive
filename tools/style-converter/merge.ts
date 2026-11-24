import { cssLonghands, physicalName } from './css-longhands.ts'
import type { CssDeclaration } from './css-rules.ts'
import {
  cssPropertyName,
  foldedKey,
  groups,
  nativeKey,
} from './property-keys.ts'
import type { Reason } from './reasons.ts'
import type { StyleEntry, StyleValue } from './style-values.ts'
import { isSideBorder } from './value-source.ts'

export type ClassDeclaration = {
  source: CssDeclaration
  selector: string
  values: ReadonlyMap<string, StyleEntry[]>
  reasons: Reason[]
}

export type Cascade = Map<string, ClassDeclaration>
type DraftValues = Map<
  string,
  { value: StyleValue; declaration: ClassDeclaration }
>

export function classDeclaration(
  source: CssDeclaration,
  selector: string,
  entries: StyleEntry[] | undefined,
  reasons: Reason[],
): ClassDeclaration {
  const names = cssLonghands(source.name)
  const values = new Map<string, StyleEntry[]>()
  for (const [key, value] of entries ?? []) {
    const parts = Object.hasOwn(groups, key) ? groups[key] : [key]
    for (const part of parts) {
      const matches = cssLonghands(cssPropertyName(part)).filter((name) =>
        names.includes(name),
      )
      // One CSS longhand can give several native keys, such as text-shadow.
      const longhands =
        matches.length === 0 && names.length === 1 ? names : matches
      for (const name of longhands) {
        const entries = values.get(name) ?? []
        const next =
          part === 'display' && value === 'inline-flex' ? 'flex' : value
        entries.push([foldedKey(name) ?? part, next])
        values.set(name, entries)
      }
    }
  }
  for (const name of names) {
    if (!values.has(name)) values.set(name, [])
  }
  return { source, selector, values, reasons }
}

export function listed(declaration: ClassDeclaration): boolean {
  return declaration.reasons.length > 0
}

type Override = (
  name: string,
  previous: ClassDeclaration,
  next: ClassDeclaration,
) => void

export function cascade(
  declarations: ClassDeclaration[],
  override?: Override,
): Cascade {
  const winners: Cascade = new Map()
  for (const declaration of declarations) {
    // Keep the order of the earlier keys in the report.
    const names = override
      ? new Set([...winners.keys(), ...declaration.values.keys()])
      : declaration.values.keys()
    for (const name of names) {
      if (!declaration.values.has(name)) continue
      const previous = winners.get(name)
      if (previous?.source.important && !declaration.source.important) continue
      if (previous) override?.(name, previous, declaration)
      winners.set(name, declaration)
    }
  }
  return winners
}

export function projectStyle(
  winners: Cascade,
  shared: ReadonlyMap<string, StyleValue>,
): DraftValues {
  const result: DraftValues = new Map()
  for (const [name, declaration] of winners) {
    if (listed(declaration)) continue
    for (const [key, value] of declaration.values.get(name) ?? []) {
      if (!foldedKey(name)) {
        result.set(key, { value, declaration })
        continue
      }
      const common = shared.get(key)
      if (common === undefined || result.has(key)) continue
      if (
        key === 'borderStyle' &&
        common === 'solid' &&
        isSideBorder(physicalName(declaration.source.name))
      )
        continue
      result.set(key, { value: common, declaration })
    }
  }
  return result
}

export function overrideNotes(
  declarations: ClassDeclaration[],
  winners: Cascade,
  draft: DraftValues,
): Map<ClassDeclaration, string[]> {
  const overrides = new Map<
    ClassDeclaration,
    Map<ClassDeclaration, Set<string>>
  >()
  cascade(declarations, (name, previous, next) => {
    if (listed(previous) === listed(next)) return
    const entries = (listed(next) ? previous : next).values.get(name) ?? []
    const keys = entries.length
      ? entries.map(([key]) => key)
      : listed(next)
        ? []
        : [nativeKey(name)]
    if (keys.length === 0) return
    const bySource =
      overrides.get(next) ?? new Map<ClassDeclaration, Set<string>>()
    const removed = bySource.get(previous) ?? new Set<string>()
    for (const key of keys) removed.add(key)
    bySource.set(previous, removed)
    overrides.set(next, bySource)
  })

  const survives = new Set(winners.values())
  const keeps = new Set(
    [...draft.values()].map(({ declaration }) => declaration),
  )
  const notes = new Map<ClassDeclaration, string[]>()
  for (const [next, bySource] of overrides) {
    const text = next.source.text.replace(/\s*\n\s*/g, ' ')
    notes.set(
      next,
      [...bySource].map(([previous, keys]) => {
        let note = `${text} overrides ${[...keys].join(', ')} from ${previous.source.name} at line ${previous.source.line}.`
        if (listed(previous)) {
          note += survives.has(previous)
            ? ' The listed declaration still applies to its other values.'
            : ' The listed declaration no longer applies.'
        } else if (keeps.has(previous)) {
          note += ' The draft keeps the other values from that declaration.'
        }
        return note
      }),
    )
  }
  return notes
}
