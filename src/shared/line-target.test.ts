import { describe, expect, it } from 'vitest'
import { lineLabel, readLineLabel, splitLineTarget } from './line-target'

describe('splitLineTarget', () => {
  it.each([
    ['src/app.ts:42', 'src/app.ts', { start: 42, end: 42 }],
    ['src/app.ts:42-50', 'src/app.ts', { start: 42, end: 50 }],
    ['src/app.ts:42:7', 'src/app.ts', { start: 42, end: 42 }],
    ['src/app.ts#L42', 'src/app.ts', { start: 42, end: 42 }],
    ['src/app.ts#L42-L50', 'src/app.ts', { start: 42, end: 50 }],
    ['src/app.ts#L42C3', 'src/app.ts', { start: 42, end: 42 }],
    ['src/app.ts#L42C3-L50C1', 'src/app.ts', { start: 42, end: 50 }],
  ])('reads %s', (text, path, lines) => {
    expect(splitLineTarget(text)).toEqual({ path, lines })
  })

  it.each([
    'src/app.ts',
    'src/app.ts:0',
    'src/app.ts:50-42',
    'src/app.ts:12345678',
    ':42',
    'src/app.ts:',
    'src/app.ts:4x',
  ])('keeps %s whole', (text) => {
    expect(splitLineTarget(text)).toEqual({ path: text, lines: null })
  })
})

describe('line labels', () => {
  it('writes and reads a line and a range', () => {
    expect(lineLabel({ start: 42, end: 42 })).toBe('42')
    expect(lineLabel({ start: 42, end: 50 })).toBe('42-50')
    expect(readLineLabel('42')).toEqual({ start: 42, end: 42 })
    expect(readLineLabel('42-50')).toEqual({ start: 42, end: 50 })
  })

  it.each([null, '', '0', '50-42', 'L42', '42-', 'x'])(
    'reads no lines from %s',
    (value) => {
      expect(readLineLabel(value)).toBe(null)
    },
  )
})
