import { describe, expect, test } from 'vitest'
import {
  peekLines,
  PREVIEW_TEXT_LIMIT,
  readTextPreview,
  textOf,
} from './local-preview'

const utf8 = (text: string) => new TextEncoder().encode(text)

describe('the local preview of a file of the draft', () => {
  test('text is UTF-8 without a NUL character, and a cut character counts as text only before more bytes', () => {
    const euro = utf8('a €')
    const cut = euro.slice(0, euro.length - 1)
    expect({
      text: textOf(euro, false),
      nul: textOf(new Uint8Array([97, 0, 98]), false),
      invalid: textOf(new Uint8Array([0xff, 0xfe, 0x41]), false),
      cutPartial: textOf(cut, true),
      cutWhole: textOf(cut, false),
    }).toEqual({
      text: 'a €',
      nul: null,
      invalid: null,
      cutPartial: 'a ',
      cutWhole: null,
    })
  })

  test('the dialog shows the whole text up to the limit, a larger text is too large, and other bytes have no preview', async () => {
    const large = new Blob([new Uint8Array(PREVIEW_TEXT_LIMIT + 1).fill(97)])
    expect({
      text: await readTextPreview(new Blob(['﻿hello\n']), 'dialog'),
      large: await readTextPreview(large, 'dialog'),
      binary: await readTextPreview(
        new Blob([new Uint8Array([1, 0])]),
        'dialog',
      ),
    }).toEqual({
      text: { kind: 'text', text: 'hello\n' },
      large: { kind: 'too-large' },
      binary: { kind: 'none' },
    })
  })

  test('the card shows the first six lines, each cut short, also of a large text', async () => {
    const lines = Array.from({ length: 9 }, (_, index) => `line ${index + 1}`)
    const long = 'x'.repeat(200)
    const large = new Blob([
      `${long}\n`,
      new Uint8Array(PREVIEW_TEXT_LIMIT).fill(97),
    ])
    expect({
      lines: peekLines(lines.join('\r\n')),
      large: await readTextPreview(large, 'peek'),
    }).toEqual({
      lines: lines.slice(0, 6).join('\n'),
      large: { kind: 'text', text: `${'x'.repeat(120)}\n${'a'.repeat(120)}` },
    })
  })
})
