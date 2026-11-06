import { expect, it } from 'vitest'

import { windowBounds } from './window.js'

it('restores visible window bounds and recovers from a disconnected display or corrupt state', () => {
  const bounds = { x: 24, y: 40, width: 1200, height: 800 }
  expect(
    windowBounds({
      readState: () => JSON.stringify(bounds),
      visible: () => true,
    }),
  ).toEqual(bounds)
  expect(
    windowBounds({
      readState: () => JSON.stringify(bounds),
      visible: () => false,
    }),
  ).toEqual({ width: 1296, height: 812 })
  expect(
    windowBounds({ readState: () => 'null', visible: () => true }),
  ).toEqual({ width: 1296, height: 812 })
})
