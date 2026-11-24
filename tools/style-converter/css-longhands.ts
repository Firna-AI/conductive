import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const data: unknown = require('mdn-data/css/properties.json')

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readComputed(data: unknown) {
  if (!isRecord(data))
    throw new Error('MDN CSS property data must be an object.')
  const computed = new Map<string, readonly string[]>()
  for (const [name, value] of Object.entries(data)) {
    const list = isRecord(value) ? value.computed : undefined
    if (typeof list === 'string') {
      computed.set(name, [])
    } else if (
      Array.isArray(list) &&
      list.every((part: unknown) => typeof part === 'string')
    ) {
      computed.set(name, list)
    } else {
      throw new Error(`MDN CSS property ${name} has an invalid computed value.`)
    }
  }
  return computed
}

const computed = readComputed(data)
const physical = new Map([
  ['overflow-block', 'overflow-y'],
  ['overflow-inline', 'overflow-x'],
  ['block-size', 'height'],
  ['inline-size', 'width'],
  ['min-block-size', 'min-height'],
  ['min-inline-size', 'min-width'],
  ['max-block-size', 'max-height'],
  ['max-inline-size', 'max-width'],
])
for (const [logical, side] of [
  ['block-start', 'top'],
  ['inline-end', 'right'],
  ['block-end', 'bottom'],
  ['inline-start', 'left'],
]) {
  physical.set(`inset-${logical}`, side)
  physical.set(`border-${logical}`, `border-${side}`)
  for (const name of ['padding', 'margin'])
    physical.set(`${name}-${logical}`, `${name}-${side}`)
  for (const name of ['color', 'style', 'width'])
    physical.set(`border-${logical}-${name}`, `border-${side}-${name}`)
}
for (const [logical, corner] of [
  ['start-start', 'top-left'],
  ['start-end', 'top-right'],
  ['end-start', 'bottom-left'],
  ['end-end', 'bottom-right'],
]) {
  physical.set(`border-${logical}-radius`, `border-${corner}-radius`)
}

// MDN gives a single entry for each of these two-side shorthands.
const logicalBorderPairs = new Map<string, readonly string[]>()
for (const [axis, first, second] of [
  ['block', 'top', 'bottom'],
  ['inline', 'left', 'right'],
]) {
  for (const name of ['color', 'style', 'width']) {
    logicalBorderPairs.set(`border-${axis}-${name}`, [
      `border-${first}-${name}`,
      `border-${second}-${name}`,
    ])
  }
}

export function physicalName(name: string): string {
  return physical.get(name) ?? name
}

const longhands = new Map<string, readonly string[]>()

function expand(name: string, path: ReadonlySet<string>): readonly string[] {
  const saved = longhands.get(name)
  if (saved) return saved
  if (path.has(name))
    throw new Error(`MDN CSS properties form a cycle at ${name}.`)
  const physical = physicalName(name)
  const parts = logicalBorderPairs.get(name) ?? computed.get(physical)
  if (!parts?.length) return [physical]
  const next = new Set([...path, name])
  const result = [...new Set(parts.flatMap((part) => expand(part, next)))]
  longhands.set(name, result)
  return result
}

const allExceptions = new Set(['all', 'direction', 'unicode-bidi'])
longhands.set('all', [
  ...new Set(
    [...computed.keys()]
      .filter((name) => !allExceptions.has(name) && !name.startsWith('--'))
      .flatMap((name) => expand(name, new Set())),
  ),
])

export function cssLonghands(name: string): readonly string[] {
  return expand(name, new Set())
}
