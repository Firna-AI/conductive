import { expect, test } from 'vitest'
import { PanelLayout } from './panels'
import { MemoryStorage } from './test-kit'

test('the split stays in its range, and the next page load gets it back', () => {
  const storage = new MemoryStorage()
  const split = new PanelLayout(storage).split
  expect(split.value()).toBe(55)
  split.step(55, { by: 99 })
  expect(new PanelLayout(storage).split.share.get()).toBe(80)
  split.step(80, { to: 'min' })
  expect(new PanelLayout(storage).split.share.get()).toBe(20)
})

test('a step that ends where it started changes and stores nothing', () => {
  const storage = new MemoryStorage()
  const split = new PanelLayout(storage).split
  split.step(80, { by: 2 })
  split.step(55, { by: 0.01 })
  expect({ share: split.share.get(), stored: storage.values.size }).toEqual({
    share: null,
    stored: 0,
  })
})

test('a drag shows each share at once, and stores only its last share', () => {
  const storage = new MemoryStorage()
  const split = new PanelLayout(storage).split
  const back = split.drag(55)
  back.move(-10)
  expect({ share: split.share.get(), stored: storage.values.size }).toEqual({
    share: 45,
    stored: 0,
  })
  back.move(0)
  back.end()
  expect({ share: split.share.get(), stored: storage.values.size }).toEqual({
    share: null,
    stored: 0,
  })
  const drag = split.drag(55)
  drag.move(-12.345)
  drag.end()
  expect(new PanelLayout(storage).split.share.get()).toBe(42.7)
})

test('a stored value that is not a share falls back to the default', () => {
  const storage = new MemoryStorage()
  storage.setItem('conductive.files-share', 'tall')
  expect(new PanelLayout(storage).split.value()).toBe(55)
  storage.setItem('conductive.files-share', '95')
  expect(new PanelLayout(storage).split.value()).toBe(80)
})
