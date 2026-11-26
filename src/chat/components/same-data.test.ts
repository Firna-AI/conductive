import { createElement } from 'react'
import { expect, test } from 'vitest'
import { sameData, samePlainData } from './same-data'

/** A plain record that holds `leaf` under `depth` records. */
function nested(depth: number, leaf: unknown): unknown {
  let value = leaf
  for (let level = 0; level < depth; level += 1) value = { inner: value }
  return value
}

test('sameData compares each prop for three levels under it, and a function or an element only as the same value', () => {
  const callback = () => undefined
  expect({
    threeLevels: sameData({ prop: nested(3, 'a') }, { prop: nested(3, 'a') }),
    fourLevels: sameData({ prop: nested(4, 'a') }, { prop: nested(4, 'a') }),
    changed: sameData({ prop: nested(2, 'a') }, { prop: nested(2, 'b') }),
    sameFunction: sameData({ callback }, { callback }),
    newFunction: sameData({ callback }, { callback: () => undefined }),
    newElement: sameData(
      { content: createElement('b') },
      { content: createElement('b') },
    ),
  }).toEqual({
    threeLevels: true,
    fourLevels: false,
    changed: false,
    sameFunction: true,
    newFunction: false,
    newElement: false,
  })
})

test('samePlainData compares plain data at each depth, such as two parses of the same text', () => {
  const block = (text: string) => ({
    kind: 'quote',
    blocks: [{ kind: 'p', text: [nested(30, text)] }],
  })
  expect({
    same: samePlainData(block('a'), block('a')),
    changed: samePlainData(block('a'), block('b')),
    lists: samePlainData([1, [2, [3]]], [1, [2, [3]]]),
    longer: samePlainData([1, 2], [1, 2, 3]),
    missing: samePlainData({ pictures: undefined }, {}),
    newFunction: samePlainData({ f: () => 1 }, { f: () => 1 }),
  }).toEqual({
    same: true,
    changed: false,
    lists: true,
    longer: false,
    missing: false,
    newFunction: false,
  })
})
