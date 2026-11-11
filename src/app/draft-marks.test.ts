import { describe, expect, test } from 'vitest'
import { mentionText } from '../shared/mention-text'
import { draftParts, fileMark, literalText, withoutMarks } from './draft-marks'

describe('the text of a draft', () => {
  test('keeps a literal file path beside a real attachment mark', () => {
    const mention = mentionText('src/\uE000ordinary-name\uE001.ts', false)
    const text = `${literalText(mention)} ${fileMark('draft-shot')}`

    expect(draftParts(text)).toEqual([
      { kind: 'text', text: '@src/\uE000ordinary-name\uE001.ts ' },
      { kind: 'file', id: 'draft-shot' },
    ])
    expect(literalText(mention)).toBe('@src/\uE0020ordinary-name\uE0021.ts')
    expect(withoutMarks(text)).toBe('@src/\uE000ordinary-name\uE001.ts ')
  })

  test('escapes the escape character without decoding its following digits', () => {
    const text = literalText('x\uE0020\uE0021\uE0022\uE002')

    expect(text).toBe('x\uE00220\uE00221\uE00222\uE0022')
    expect(draftParts(text)).toEqual([
      { kind: 'text', text: 'x\uE0020\uE0021\uE0022\uE002' },
    ])
    expect(withoutMarks(text)).toBe('x\uE0020\uE0021\uE0022\uE002')
  })

  test('keeps malformed escapes and lone delimiters in one text part', () => {
    const text = '\uE001\uE000\uE001\uE000open\uE002x\uE0020\uE002'

    expect(draftParts(text)).toEqual([
      { kind: 'text', text: '\uE001\uE000\uE001\uE000open\uE002x\uE000\uE002' },
    ])
    expect(withoutMarks(text)).toBe(
      '\uE001\uE000\uE001\uE000open\uE002x\uE000\uE002',
    )
  })

  test('keeps file IDs opaque while decoding only the surrounding text', () => {
    const text = `\uE000${fileMark('opaque id/\uE0020\nx')}\uE0020${fileMark('draft-notes')}`

    expect(draftParts(text)).toEqual([
      { kind: 'text', text: '\uE000' },
      { kind: 'file', id: 'opaque id/\uE0020\nx' },
      { kind: 'text', text: '\uE000' },
      { kind: 'file', id: 'draft-notes' },
    ])
    expect(withoutMarks(text)).toBe('\uE000\uE000')
  })
})
