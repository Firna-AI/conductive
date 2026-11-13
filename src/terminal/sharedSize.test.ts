import { expect, it } from 'vitest'

import { fittedFontSize } from './sharedSize'

it('keeps the normal font for a shared size that fits, and scales down to 6px', () => {
  expect(
    fittedFontSize(12, { cols: 80, rows: 24 }, { columns: 40, rows: 10 }),
  ).toBe(12)
  expect(
    fittedFontSize(12, { cols: 80, rows: 24 }, { columns: 120, rows: 24 }),
  ).toBe(8)
  expect(
    fittedFontSize(12, { cols: 80, rows: 24 }, { columns: 80, rows: 30 }),
  ).toBe(9.5)
  expect(
    fittedFontSize(12, { cols: 20, rows: 5 }, { columns: 500, rows: 200 }),
  ).toBe(6)
})
