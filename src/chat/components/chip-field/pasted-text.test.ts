import { describe, expect, test } from 'vitest'
import type { DraftFile } from '../../../app/draft-files'
import {
  isLargePaste,
  PASTE_FILE_CHARACTERS,
  PASTE_FILE_LINES,
  pastedFileName,
} from './pasted-text'

function held(...names: string[]): DraftFile[] {
  return names.map((name, index) => ({
    state: 'uploading',
    id: `draft-${index}`,
    file: new File(['x'], name),
    sentBytes: null,
  }))
}

describe('pasted text', () => {
  test('a paste is large from the character limit or the line limit, with any line ends', () => {
    const crlfLines = Array(PASTE_FILE_LINES).fill('a').join('\r\n')
    expect({
      underBoth: isLargePaste('a'.repeat(PASTE_FILE_CHARACTERS - 1)),
      characters: isLargePaste('a'.repeat(PASTE_FILE_CHARACTERS)),
      crlfLines: isLargePaste(crlfLines),
      fewerLines: isLargePaste(
        Array(PASTE_FILE_LINES - 1)
          .fill('a')
          .join('\r'),
      ),
    }).toEqual({
      underBoth: false,
      characters: true,
      crlfLines: true,
      fewerLines: false,
    })
  })

  test('each pasted file of a draft gets the number after the highest pasted name that the draft holds', () => {
    expect({
      empty: pastedFileName([]),
      first: pastedFileName(held('notes.md', 'Pasted text.txt')),
      gap: pastedFileName(held('Pasted text 3.txt', 'Pasted text.txt')),
      other: pastedFileName(held('Pasted text.md', 'pasted text.txt')),
    }).toEqual({
      empty: 'Pasted text.txt',
      first: 'Pasted text 2.txt',
      gap: 'Pasted text 4.txt',
      other: 'Pasted text.txt',
    })
  })
})
