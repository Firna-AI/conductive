import { describe, expect, test } from 'vitest'
import { PaneSplit, paneShareRange } from './pane-split'
import type { KeyValueStorage } from './services'
import { MemoryStorage } from './test-kit'

/** A browser that refuses its storage, as some private windows do. */
const refusing: KeyValueStorage = {
  getItem: () => {
    throw new Error('The storage is not available.')
  },
  setItem: () => {
    throw new Error('The storage is not available.')
  },
}

describe('PaneSplit', () => {
  test('a stored value that is not a share gives the even split', () => {
    const shares = ['wide', '0', '100', '-5'].map((stored) => {
      const storage = new MemoryStorage()
      new PaneSplit(storage).step(50, { to: 'min' }, paneShareRange(1000))
      const key = [...storage.values.keys()][0]
      storage.setItem(key, stored)
      return new PaneSplit(storage).share.get()
    })
    expect(shares).toEqual([null, null, null, null])
  })

  test('a refused storage keeps the share while the page stays open', () => {
    const split = new PaneSplit(refusing)
    expect(() =>
      split.step(50, { to: 'max' }, paneShareRange(1000)),
    ).not.toThrow()
    expect(split.share.get()).toBe(67.9)
  })
})
