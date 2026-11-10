import { describe, expect, test } from 'vitest'
import { joinFieldParts, type FieldPart } from './field-text'

const link = 'https://app.conductive.test/orgs/acme/workspaces/saved-carts'
const other = 'https://app.conductive.test/orgs/acme/workspaces/fonts'
const chip = (source: string): FieldPart => ({ kind: 'chip', source })
const text = (value: string): FieldPart => ({ kind: 'text', text: value })

describe('the plain text of a field with chips', () => {
  test('keeps the exact link of each chip, with a space only where the text beside it would join the link', () => {
    const cases: [string, readonly FieldPart[], string][] = [
      [
        'a word typed after the chip',
        [chip(link), text("'s tests")],
        `${link} 's tests`,
      ],
      [
        'a path typed after the chip',
        [chip(link), text('/files')],
        `${link} /files`,
      ],
      ['two chips side by side', [chip(link), chip(other)], `${link} ${other}`],
      [
        'a full stop after the chip',
        [chip(link), text('. Next')],
        `${link}. Next`,
      ],
      ['a space after the chip', [chip(link), text(' then')], `${link} then`],
      ['a word right before the chip', [text('See'), chip(link)], `See${link}`],
      ['a line after the chip', [chip(link), text('\nnext')], `${link}\nnext`],
      ['a chip at the end', [text('Done: '), chip(link)], `Done: ${link}`],
    ]
    for (const [name, parts, expected] of cases) {
      expect({ name, text: joinFieldParts(parts) }).toEqual({
        name,
        text: expected,
      })
    }
  })
})
